"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CHECKOUT_COUNTRIES } from "@/lib/countries"
import { formatCurrency, formatCurrencyWhole } from "@/lib/utils"
import {
  MONTHLY_AMOUNT_PRESETS_PENCE,
  poundsToPence,
} from "@/lib/monthly-donate"
import { ChevronLeft, Wand2, HandHeart, RefreshCw } from "lucide-react"
import { z } from "zod"

type DonationType = "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"

type MonthlyDonateAppeal = {
  id: string
  title: string
  donationTypesEnabled: DonationType[]
}

interface MonthlyDonatePageProps {
  appeals: MonthlyDonateAppeal[]
  stripePublishableKey: string
  /** Prefill from `/monthly/[amount]` as whole pounds (e.g. 4 → £4). */
  initialAmountPounds?: number | null
}

type CheckoutCreateResponse = {
  orderId: string
  orderNumber: string
  mode: "payment" | "subscription" | "mixed" | "setup"
  paymentClientSecret?: string
  subscriptionClientSecret?: string
  paymentIntentId?: string
  subscriptionId?: string
}

const donorSchema = z.object({
  firstName: z.string().min(1, "First name is required").transform((s) => s.trim()),
  lastName: z.string().min(1, "Last name is required").transform((s) => s.trim()),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email")
    .transform((s) => s.trim().toLowerCase()),
  phone: z.string().optional(),
  address: z.string().min(1, "Address is required").transform((s) => s.trim()),
  city: z.string().min(1, "City is required").transform((s) => s.trim()),
  postcode: z.string().min(1, "Postcode is required").transform((s) => s.trim()),
  country: z.string().min(1, "Country is required"),
  giftAid: z.boolean().default(false),
})

type DonorFormData = z.infer<typeof donorSchema>

function capFirstLetter(s: string): string {
  if (!s.length) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function MonthlyPaymentConfirm(props: {
  order: CheckoutCreateResponse
  validated: DonorFormData
  totalPence: number
  onBack: () => void
  onSuccess: (orderId: string) => void
}) {
  const { order, validated, totalPence, onBack, onSuccess } = props
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentError(null)
    if (!stripe || !elements) return
    setSubmitting(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/success/${order.orderId}`,
          payment_method_data: {
            billing_details: {
              name: `${validated.firstName} ${validated.lastName}`.trim(),
              email: validated.email,
              phone: validated.phone || undefined,
              address: {
                line1: validated.address || undefined,
                city: validated.city || undefined,
                postal_code: validated.postcode || undefined,
                country: validated.country || undefined,
              },
            },
          },
        },
      })
      if (error) {
        setPaymentError(error.message || "Payment failed. Please try again.")
        return
      }
      try {
        await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber: order.orderNumber,
            ...(order.paymentIntentId ? { paymentIntentId: order.paymentIntentId } : {}),
            ...(order.subscriptionId ? { subscriptionId: order.subscriptionId } : {}),
          }),
        })
      } catch {
        // Webhook / confirm race is fine
      }
      onSuccess(order.orderId)
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Payment failed. Please try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-md border bg-background px-3 py-3">
            <PaymentElement />
          </div>
          {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
          <p className="text-xs text-muted-foreground">
            Charged now, then{" "}
            <span className="font-medium text-foreground">{formatCurrency(totalPence)}</span>{" "}
            every month. Cancel anytime.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Button>
            <Button type="submit" size="lg" disabled={submitting || !stripe || !elements}>
              {submitting ? "Processing..." : `Start £${(totalPence / 100).toFixed(totalPence % 100 === 0 ? 0 : 2)}/month`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export function MonthlyDonatePage({
  appeals,
  stripePublishableKey,
  initialAmountPounds = null,
}: MonthlyDonatePageProps) {
  const router = useRouter()
  const stripePromise = React.useMemo(
    () => loadStripe(stripePublishableKey),
    [stripePublishableKey],
  )

  const initialPence =
    initialAmountPounds != null && initialAmountPounds > 0
      ? poundsToPence(initialAmountPounds)
      : null
  const initialIsPreset =
    initialPence != null &&
    (MONTHLY_AMOUNT_PRESETS_PENCE as readonly number[]).includes(initialPence)

  const [selectedAmountPence, setSelectedAmountPence] = React.useState<number | null>(
    initialIsPreset ? initialPence : initialPence == null ? 1000 : null,
  )
  const [customAmount, setCustomAmount] = React.useState(
    initialPence != null && !initialIsPreset
      ? String(initialAmountPounds)
      : "",
  )
  const [impactMode, setImpactMode] = React.useState<"auto" | "choose">("auto")
  const [selectedAppealId, setSelectedAppealId] = React.useState<string | null>(
    appeals[0]?.id ?? null,
  )
  const [isZakat, setIsZakat] = React.useState(false)

  const [formData, setFormData] = React.useState<Record<string, string | boolean>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    country: "GB",
    giftAid: false,
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [creatingPayment, setCreatingPayment] = React.useState(false)
  const [orderInfo, setOrderInfo] = React.useState<CheckoutCreateResponse | null>(null)
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [validatedSnapshot, setValidatedSnapshot] = React.useState<DonorFormData | null>(null)
  const [lastAmountPence, setLastAmountPence] = React.useState<number | null>(null)

  const mostNeedyAppeal = appeals[0] ?? null
  const effectiveAppeal =
    impactMode === "auto"
      ? mostNeedyAppeal
      : appeals.find((a) => a.id === selectedAppealId) ?? mostNeedyAppeal

  const baseAmountPence =
    selectedAmountPence ??
    (customAmount ? Math.round(Number(customAmount || "0") * 100) || 0 : 0)

  const canSubmit =
    !!effectiveAppeal && baseAmountPence >= 100 && Number.isFinite(baseAmountPence)

  const countryOptions = React.useMemo(() => {
    const display = new Intl.DisplayNames(["en"], { type: "region" })
    return CHECKOUT_COUNTRIES.map((code) => ({
      code,
      label: display.of(code) || code,
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  const handlePresetClick = (amountPence: number) => {
    setSelectedAmountPence(amountPence)
    setCustomAmount("")
  }

  const resetPaymentSession = React.useCallback(() => {
    setClientSecret(null)
    setOrderInfo(null)
    setValidatedSnapshot(null)
    setLastAmountPence(null)
  }, [])

  React.useEffect(() => {
    if (clientSecret && lastAmountPence !== null && baseAmountPence !== lastAmountPence) {
      resetPaymentSession()
    }
  }, [baseAmountPence, clientSecret, lastAmountPence, resetPaymentSession])

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !effectiveAppeal) return
    setErrors({})
    const parsed = donorSchema.safeParse({
      ...formData,
      giftAid: Boolean(formData.giftAid),
    })
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.issues.forEach((err) => {
        const path = err.path[0]
        if (path) fieldErrors[path.toString()] = err.message
      })
      setErrors(fieldErrors)
      return
    }
    const donor = parsed.data
    setCreatingPayment(true)
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              appealId: effectiveAppeal.id,
              appealTitle: effectiveAppeal.title,
              frequency: "MONTHLY",
              donationType: (isZakat ? "ZAKAT" : "GENERAL") as DonationType,
              amountPence: baseAmountPence,
            },
          ],
          donor: {
            firstName: donor.firstName,
            lastName: donor.lastName,
            email: donor.email,
            phone: donor.phone || undefined,
            address: donor.address,
            city: donor.city,
            postcode: donor.postcode,
            country: donor.country,
            billingAddress: donor.address,
            billingCity: donor.city,
            billingPostcode: donor.postcode,
            billingCountry: donor.country,
            marketingEmail: false,
            marketingSMS: false,
            giftAid: donor.giftAid,
            coverFees: false,
          },
          subtotalPence: baseAmountPence,
          feesPence: 0,
          totalPence: baseAmountPence,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Could not start monthly donation.")
      }
      const data = (await response.json()) as CheckoutCreateResponse
      const secret = data.subscriptionClientSecret || data.paymentClientSecret || null
      if (!secret) throw new Error("No payment session returned.")
      setOrderInfo(data)
      setClientSecret(secret)
      setValidatedSnapshot(donor)
      setLastAmountPence(baseAmountPence)
    } catch (error) {
      setErrors({
        _form:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      })
    } finally {
      setCreatingPayment(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 sm:max-w-lg sm:px-0 sm:py-8">
      <section className="space-y-4">
        <div className="space-y-0.5 text-foreground">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
            <RefreshCw className="size-3.5" />
            Monthly giving
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Give every month
          </h1>
          <p className="max-w-md text-sm text-muted-foreground sm:text-base">
            Set up a monthly donation in minutes. Cancel anytime.
          </p>
        </div>

        <div className="space-y-6 pt-5">
          <div className="space-y-3">
            <span className="text-xl font-semibold text-foreground sm:text-2xl">
              Monthly amount
            </span>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MONTHLY_AMOUNT_PRESETS_PENCE.map((amount) => {
                const isActive = selectedAmountPence === amount && !customAmount
                return (
                  <Button
                    key={amount}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="h-11 rounded-full text-base font-semibold sm:text-lg"
                    onClick={() => handlePresetClick(amount)}
                    disabled={!!clientSecret}
                  >
                    {formatCurrencyWhole(amount)}
                  </Button>
                )
              })}
              <Button
                type="button"
                variant={customAmount || selectedAmountPence === null ? "default" : "outline"}
                size="sm"
                className="h-11 rounded-full text-base font-semibold sm:col-span-1 sm:text-lg"
                onClick={() => {
                  setSelectedAmountPence(null)
                  if (!customAmount) setCustomAmount("15")
                }}
                disabled={!!clientSecret}
              >
                Custom
              </Button>
            </div>

            {(selectedAmountPence === null || customAmount) && (
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                  £
                </span>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  disabled={!!clientSecret}
                  className="h-14 w-full rounded-xl border border-input bg-background/95 pl-9 pr-16 text-right text-2xl font-semibold tracking-tight text-foreground outline-none ring-0 transition focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:outline-none disabled:opacity-60"
                  value={customAmount || ""}
                  onChange={(e) => {
                    setCustomAmount(e.target.value)
                    setSelectedAmountPence(null)
                  }}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  /month
                </span>
              </div>
            )}

            {baseAmountPence > 0 && selectedAmountPence !== null && (
              <p className="text-sm text-muted-foreground">
                You&apos;ll give{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(baseAmountPence)}
                </span>{" "}
                every month.
              </p>
            )}

            <div className="flex items-center gap-3 text-xl sm:text-2xl">
              <Checkbox
                id="monthly-zakat"
                checked={isZakat}
                disabled={!!clientSecret}
                onCheckedChange={(checked) => setIsZakat(checked === true)}
                className="size-6"
              />
              <Label
                htmlFor="monthly-zakat"
                className="flex items-center gap-1 font-medium text-muted-foreground"
              >
                Count this as your Zakat
              </Label>
            </div>
          </div>

          {appeals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Choose your impact
                </span>
                <span className="text-xs text-muted-foreground">
                  Alianah-verified campaigns
                </span>
              </div>

              <Tabs
                value={impactMode}
                onValueChange={(value) => {
                  if (clientSecret) return
                  setImpactMode(value === "choose" ? "choose" : "auto")
                }}
                className="w-full"
              >
                <TabsList className="grid h-14 w-full grid-cols-2 rounded-full bg-muted/80 p-1">
                  <TabsTrigger
                    value="auto"
                    disabled={!!clientSecret}
                    className="inline-flex h-full items-center justify-center gap-1.5 rounded-full text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-base"
                  >
                    <Wand2 className="h-4 w-4" />
                    <span>Our choice</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="choose"
                    disabled={!!clientSecret}
                    className="inline-flex h-full items-center justify-center gap-1.5 rounded-full text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-base"
                  >
                    <HandHeart className="h-4 w-4" />
                    <span>I&apos;ll choose</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {impactMode === "auto" ? (
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
                  <p className="font-semibold text-foreground">We&apos;ll take care of it</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your monthly gift goes to impactful, verified appeals where it&apos;s
                    needed most.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Destination
                  </Label>
                  <Select
                    value={selectedAppealId ?? undefined}
                    onValueChange={(value) => setSelectedAppealId(value)}
                    disabled={!!clientSecret}
                  >
                    <SelectTrigger className="h-14 w-full rounded-xl border-muted bg-muted/70 text-sm sm:text-base">
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {appeals.map((appeal) => (
                        <SelectItem key={appeal.id} value={appeal.id}>
                          {appeal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {!clientSecret ? (
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Your details</p>
                <p className="text-xs text-muted-foreground">
                  Needed for your receipt and to set up the monthly subscription.
                </p>
              </div>
              {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-firstName">First name</Label>
                  <Input
                    id="monthly-firstName"
                    value={String(formData.firstName)}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        firstName: capFirstLetter(e.target.value),
                      }))
                    }
                    className={errors.firstName ? "border-destructive" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-lastName">Last name</Label>
                  <Input
                    id="monthly-lastName"
                    value={String(formData.lastName)}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        lastName: capFirstLetter(e.target.value),
                      }))
                    }
                    className={errors.lastName ? "border-destructive" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-email">Email</Label>
                  <Input
                    id="monthly-email"
                    type="email"
                    value={String(formData.email)}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-phone">Phone (optional)</Label>
                  <Input
                    id="monthly-phone"
                    type="tel"
                    value={String(formData.phone)}
                    onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+44 7700 900000"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly-address">Address</Label>
                <Input
                  id="monthly-address"
                  value={String(formData.address)}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      address: capFirstLetter(e.target.value),
                    }))
                  }
                  className={errors.address ? "border-destructive" : ""}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">{errors.address}</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-city">City</Label>
                  <Input
                    id="monthly-city"
                    value={String(formData.city)}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        city: capFirstLetter(e.target.value),
                      }))
                    }
                    className={errors.city ? "border-destructive" : ""}
                  />
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monthly-postcode">Postcode</Label>
                  <Input
                    id="monthly-postcode"
                    value={String(formData.postcode)}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        postcode: e.target.value.toUpperCase(),
                      }))
                    }
                    className={errors.postcode ? "border-destructive" : ""}
                  />
                  {errors.postcode && (
                    <p className="text-xs text-destructive">{errors.postcode}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly-country">Country</Label>
                <select
                  id="monthly-country"
                  value={String(formData.country)}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {countryOptions.map(({ code, label }) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Checkbox
                  id="monthly-giftAid"
                  checked={Boolean(formData.giftAid)}
                  onCheckedChange={(c) =>
                    setFormData((p) => ({ ...p, giftAid: c === true }))
                  }
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="monthly-giftAid" className="cursor-pointer text-sm font-normal">
                    Add Gift Aid (UK taxpayers)
                  </Label>
                  {baseAmountPence > 0 && (
                    <p className="text-xs text-muted-foreground">
                      We can claim an extra{" "}
                      {formatCurrency(Math.round(baseAmountPence * 0.25))} each month at no
                      cost to you.
                    </p>
                  )}
                </div>
              </div>
              {formData.giftAid && (
                <div className="rounded-lg border p-4 text-muted-foreground">
                  <p className="text-sm font-normal">
                    I confirm I am a UK taxpayer and understand that if I pay less Income Tax
                    and/or Capital Gains Tax than the amount of Gift Aid claimed on all my
                    donations in that tax year it is my responsibility to pay any difference.
                  </p>
                </div>
              )}
              <Button
                type="submit"
                className="h-11 w-full rounded-full text-sm font-semibold"
                disabled={!canSubmit || creatingPayment}
              >
                {creatingPayment
                  ? "Preparing subscription..."
                  : baseAmountPence > 0
                    ? `Continue to payment (${formatCurrency(baseAmountPence)}/month)`
                    : "Continue to payment"}
              </Button>
            </form>
          ) : orderInfo && validatedSnapshot && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "night" },
              }}
              key={clientSecret}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Choose payment method
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your card will be charged {formatCurrency(baseAmountPence)} now and each
                    month thereafter.
                  </p>
                </div>
                <MonthlyPaymentConfirm
                  order={orderInfo}
                  validated={validatedSnapshot}
                  totalPence={baseAmountPence}
                  onBack={resetPaymentSession}
                  onSuccess={(orderId) => {
                    router.push(`/success/${orderId}`)
                  }}
                />
              </div>
            </Elements>
          ) : null}
        </div>
      </section>
    </div>
  )
}
