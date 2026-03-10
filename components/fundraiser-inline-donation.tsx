"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatCurrency,
  formatCurrencyWhole,
  isValidEmail,
  isValidPhone,
  toTitleCaseLive,
  toUpperCaseLive,
} from "@/lib/utils"
import { CHECKOUT_COUNTRIES } from "@/lib/countries"
import { ChevronDown } from "lucide-react"

const stripePromise =
  typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string"
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null

const countryOptions = (() => {
  const display = new Intl.DisplayNames(["en"], { type: "region" })
  return CHECKOUT_COUNTRIES.map((code) => ({
    code,
    label: display.of(code) || code,
  })).sort((a, b) => a.label.localeCompare(b.label))
})()

function isLikelyName(value: string): boolean {
  const v = value.trim()
  if (v.length < 2 || v.length > 60) return false
  return /^[A-Za-z][A-Za-z\s.'-]*$/.test(v)
}

type DonationType = "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"

export type FundraiserInlineDonationProps = {
  fundraiserId: string
  appealId: string
  appealTitle: string
  campaignTitle: string
  organizerName: string
  donationTypesEnabled: string[]
}

export function FundraiserInlineDonation({
  fundraiserId,
  appealId,
  appealTitle,
  campaignTitle,
  organizerName,
  donationTypesEnabled,
}: FundraiserInlineDonationProps) {
  const router = useRouter()
  const [customAmount, setCustomAmount] = React.useState("")
  const [countAsZakat, setCountAsZakat] = React.useState(false)
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [giftAid, setGiftAid] = React.useState(false)
  const showZakatCard = donationTypesEnabled.includes("ZAKAT")
  const effectiveDonationType: DonationType =
    countAsZakat && showZakatCard ? "ZAKAT" : "SADAQAH"
  const [paymentMethod, setPaymentMethod] = React.useState<"card" | null>(null)
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [orderId, setOrderId] = React.useState<string | null>(null)
  const [orderNumber, setOrderNumber] = React.useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [billingErrors, setBillingErrors] = React.useState<{
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    postcode?: string
    country?: string
  }>({})
  const [billing, setBilling] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    country: "GB",
  })

  const amountPence = React.useMemo(() => {
    const raw = customAmount.replace(/,/g, "")
    const n = parseFloat(raw)
    if (!Number.isFinite(n) || n < 0) return 0
    return Math.round(n * 100)
  }, [customAmount])

  const handleCreateOrderAndPay = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { firstName, lastName, email, address, city, postcode, country } = billing

    if (!amountPence || amountPence < 100) {
      setError("Please enter at least £1.")
      return
    }

    const nextErrors: typeof billingErrors = {}
    if (!firstName.trim()) {
      nextErrors.firstName = "First name is required"
    } else if (!isLikelyName(firstName)) {
      nextErrors.firstName = "Enter a valid first name"
    }
    if (!lastName.trim()) {
      nextErrors.lastName = "Last name is required"
    } else if (!isLikelyName(lastName)) {
      nextErrors.lastName = "Enter a valid last name"
    }
    if (!email.trim()) {
      nextErrors.email = "Email is required"
    } else if (!isValidEmail(email)) {
      nextErrors.email = "Enter a valid email address"
    }
    if (!address.trim()) nextErrors.address = "Address is required"
    if (!city.trim()) nextErrors.city = "City is required"
    if (!country.trim()) nextErrors.country = "Country is required"
    if (!postcode.trim()) nextErrors.postcode = "Postcode is required"
    if (billing.phone.trim() && !isValidPhone(billing.phone)) {
      nextErrors.phone = "Enter a valid phone number"
    }

    if (Object.keys(nextErrors).length > 0) {
      setBillingErrors(nextErrors)
      return
    }
    setBillingErrors({})

    setLoading(true)
    try {
      const res = await fetch(`/api/fundraisers/${fundraiserId}/donate-inline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence,
          donationType: effectiveDonationType,
          isAnonymous,
          giftAid,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          address: address?.trim() || undefined,
          city: city?.trim() || undefined,
          postcode: postcode?.trim() || undefined,
          country: country?.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not start payment.")
        return
      }
      setClientSecret(data.paymentClientSecret)
      setOrderId(data.orderId)
      setOrderNumber(data.orderNumber)
      setPaymentIntentId(data.paymentIntentId)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (clientSecret && orderId && orderNumber && paymentIntentId) {
    return (
      <Card className="border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "oklch(0.574 0.259 142.38)",
                  borderRadius: "8px",
                },
              },
            }}
            key={clientSecret}
          >
            <CardPaymentStep
              orderId={orderId}
              orderNumber={orderNumber}
              paymentIntentId={paymentIntentId}
              amountPence={amountPence}
              onSuccess={() => router.push(`/success/${orderId}`)}
              onBack={() => {
                setClientSecret(null)
                setOrderId(null)
                setOrderNumber(null)
                setPaymentIntentId(null)
              }}
            />
          </Elements>
        </CardContent>
      </Card>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <Card className="border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8">
            {/* Left: Amount */}
          <div className="space-y-5">
            <div className="space-y-1.5">
              <p className="text-neutral-800 dark:text-foreground">
                <span className="font-normal">Support </span>
                <span className="font-bold text-neutral-900 dark:text-foreground underline underline-offset-2 decoration-neutral-700 dark:decoration-muted-foreground">
                  {campaignTitle}
                </span>
              </p>
              <p className="text-sm text-neutral-500 dark:text-muted-foreground">Organized by {organizerName}</p>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-neutral-900 dark:text-foreground text-base">Your giving amount</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-900 dark:text-foreground text-2xl font-semibold pointer-events-none select-none">
                  £
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="20.00"
                  value={customAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, "")
                    if (!raw) {
                      setCustomAmount("")
                      return
                    }
                    // Allow only digits and optional single decimal point
                    if (!/^\d*\.?\d*$/.test(raw)) return
                    const [intPart, decPart] = raw.split(".")
                    const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    const next = decPart !== undefined ? `${intWithCommas}.${decPart}` : intWithCommas
                    setCustomAmount(next)
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(/,/g, "").trim()
                    if (!raw) return
                    const n = parseFloat(raw)
                    if (Number.isFinite(n) && n >= 0) {
                      setCustomAmount(
                        n.toLocaleString("en-GB", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      )
                    }
                  }}
                  className="h-24 !text-4xl md:!text-5xl pl-10 pr-4 rounded-2xl border-neutral-200 dark:border-border bg-transparent text-right font-semibold text-neutral-900 dark:text-foreground placeholder:text-neutral-400 dark:placeholder:text-muted-foreground tracking-tight"
                />
              </div>
            </div>

            {showZakatCard && (
              <div className="rounded-xl border border-neutral-200 dark:border-border bg-white dark:bg-muted/30 p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 dark:text-foreground text-base">Zakat-verified Campaign 💚</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <Label
                    htmlFor="inline-zakat"
                    className="cursor-pointer flex-1 text-sm text-neutral-900 dark:text-foreground"
                  >
                    Count this as your Zakat
                  </Label>
                  <Switch
                    id="inline-zakat"
                    checked={countAsZakat}
                    onCheckedChange={(checked) => setCountAsZakat(checked === true)}
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-neutral-200 dark:border-border bg-white dark:bg-muted/30 p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-900 dark:text-foreground text-base">Donate Anonymously 👀</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label
                  htmlFor="inline-anonymous"
                  className="cursor-pointer flex-1 text-sm text-neutral-900 dark:text-foreground"
                >
                  Hide your name from being displayed publicly.
                </Label>
                <Switch
                  id="inline-anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-border bg-white dark:bg-muted/30 p-4 space-y-3">
              <div className="relative h-12 w-40">
                <Image
                  src="/giftaid%20light.png"
                  alt="Gift Aid"
                  fill
                  sizes="112px"
                  className="object-contain object-left dark:hidden"
                  priority={false}
                />
                <Image
                  src="/giftaid%20dark.png"
                  alt="Gift Aid"
                  fill
                  sizes="112px"
                  className="hidden object-contain object-left dark:block"
                  priority={false}
                />
              </div>
              <p className="text-sm text-neutral-900 dark:text-foreground">
                Gift Aid lets charities reclaim tax on your donation. For every £1 you give, we can claim an extra 25p from HMRC. You don&apos;t pay anything more.
              </p>
                <div className="text-sm text-neutral-900 dark:text-foreground space-y-1">
                <div className="flex justify-between gap-4">
                  <span>Your donation</span>
                  <span className="font-medium">{formatCurrency(amountPence)}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-primary">With Gift Aid (25% added)</span>
                    <span className="font-semibold text-primary">
                    {formatCurrency(Math.round(amountPence * 1.25))}
                  </span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-4 pt-1">
                <Label
                  htmlFor="inline-giftaid"
                  className="cursor-pointer flex-1 text-sm text-neutral-900 dark:text-foreground leading-snug"
                >
                  I am a UK taxpayer and would like to add Gift Aid to my donation of{" "}
                  {amountPence > 0
                    ? `£${(amountPence / 100).toFixed(2)}`
                    : "this amount"}{" "}
                  and any donations I make in the future.
                </Label>
                <Switch
                  id="inline-giftaid"
                  checked={giftAid}
                  onCheckedChange={(checked) => setGiftAid(checked === true)}
                  className="mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Right: Payment */}
          <div className="space-y-5">
            <h3 className="font-bold text-neutral-900 dark:text-foreground text-base">Your Details</h3>

            <WalletButtons
              fundraiserId={fundraiserId}
              appealId={appealId}
              appealTitle={appealTitle}
              amountPence={amountPence}
              donationType={effectiveDonationType}
              isAnonymous={isAnonymous}
              giftAid={giftAid}
              onSuccess={(id) => router.push(`/success/${id}`)}
            />

            <form
              onSubmit={handleCreateOrderAndPay}
              className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border border-neutral-200 dark:border-border py-5 px-4 sm:px-5 transition-shadow duration-200 shadow-none hover:shadow-none"
            >
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-neutral-900 dark:text-foreground">Billing details</h4>
                <p className="text-xs text-neutral-500 dark:text-muted-foreground">All fields required unless marked otherwise.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">First name</Label>
                  <Input
                    required
                    className="h-11 rounded-lg"
                    placeholder="J."
                    value={billing.firstName}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, firstName: toTitleCaseLive(e.target.value) }))
                    }
                  />
                  {billingErrors.firstName && (
                    <p className="text-xs text-destructive">{billingErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">Last name</Label>
                  <Input
                    required
                    className="h-11 rounded-lg"
                    placeholder="Smith"
                    value={billing.lastName}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, lastName: toTitleCaseLive(e.target.value) }))
                    }
                  />
                  {billingErrors.lastName && (
                    <p className="text-xs text-destructive">{billingErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    required
                    className="h-11 rounded-lg"
                    placeholder="you@example.com"
                    value={billing.email}
                    onChange={(e) => setBilling((b) => ({ ...b, email: e.target.value }))}
                  />
                  {billingErrors.email && (
                    <p className="text-xs text-destructive">{billingErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">Phone number</Label>
                  <Input
                    type="tel"
                    className="h-11 rounded-lg"
                    placeholder="+44 7..."
                    value={billing.phone}
                    onChange={(e) => setBilling((b) => ({ ...b, phone: e.target.value }))}
                  />
                  {billingErrors.phone && (
                    <p className="text-xs text-destructive">{billingErrors.phone}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-neutral-700 dark:text-muted-foreground uppercase tracking-wide">Billing address</Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">Address</Label>
                  <Input
                    className="h-11 rounded-lg"
                    placeholder="House number and street"
                    value={billing.address}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, address: toTitleCaseLive(e.target.value) }))
                    }
                  />
                  {billingErrors.address && (
                    <p className="text-xs text-destructive">{billingErrors.address}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">Postal code</Label>
                  <Input
                    className="h-11 rounded-lg"
                    placeholder="Postal code"
                    value={billing.postcode}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, postcode: toUpperCaseLive(e.target.value) }))
                    }
                  />
                  {billingErrors.postcode && (
                    <p className="text-xs text-destructive">{billingErrors.postcode}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">City</Label>
                  <Input
                    className="h-11 rounded-lg"
                    placeholder="City"
                    value={billing.city}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, city: toTitleCaseLive(e.target.value) }))
                    }
                  />
                  {billingErrors.city && (
                    <p className="text-xs text-destructive">{billingErrors.city}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700 dark:text-muted-foreground">Country</Label>
                  <Select
                    value={billing.country}
                    onValueChange={(v) => setBilling((b) => ({ ...b, country: v }))}
                    required
                  >
                    <SelectTrigger className="h-11 !h-11 rounded-lg border-neutral-200 dark:border-border w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map(({ code, label }) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {billingErrors.country && (
                    <p className="text-xs text-destructive">{billingErrors.country}</p>
                  )}
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={loading || amountPence < 100}
                className="w-full h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
              >
                {loading ? "Preparing…" : `Donate ${formatCurrencyWhole(amountPence)}`}
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
    </Elements>
  )
}

function WalletButtons({
  fundraiserId,
  appealId,
  appealTitle,
  amountPence,
  donationType,
  isAnonymous,
  giftAid,
  onSuccess,
}: {
  fundraiserId: string
  appealId: string
  appealTitle: string
  amountPence: number
  donationType: DonationType
  isAnonymous: boolean
  giftAid: boolean
  onSuccess: (orderId: string) => void
}) {
  const stripe = useStripe()
  const router = useRouter()
  const [paymentRequest, setPaymentRequest] = React.useState<ReturnType<
    NonNullable<ReturnType<typeof useStripe>>["paymentRequest"]
  > | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const processingRef = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      if (!stripe || amountPence < 100) return
      const pr = stripe.paymentRequest({
        country: "GB",
        currency: "gbp",
        total: { label: "Donation", amount: amountPence },
        requestPayerEmail: true,
      })
      const result = await pr.canMakePayment()
      if (cancelled) return
      if (result) setPaymentRequest(pr)

      pr.on("paymentmethod", async (ev) => {
        if (processingRef.current) {
          ev.complete("fail")
          return
        }
        processingRef.current = true
        setSubmitting(true)
        setError(null)
        try {
          const email = (ev.paymentMethod.billing_details?.email as string | undefined)?.trim()
          if (!email) {
            ev.complete("fail")
            setError("Add an email in your wallet for the receipt.")
            return
          }
          const res = await fetch("/api/checkout/create-express", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: [
                {
                  appealId,
                  appealTitle,
                  fundraiserId,
                  frequency: "ONE_OFF",
                  donationType,
                  amountPence,
                  isAnonymous,
                },
              ],
              email,
              subtotalPence: amountPence,
              coverFees: false,
              giftAid,
            }),
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            ev.complete("fail")
            setError(data.error || "Could not create order.")
            return
          }
          const data = (await res.json()) as {
            orderId: string
            orderNumber: string
            paymentClientSecret: string
            paymentIntentId: string
          }
          const { error: confirmError } = await stripe.confirmCardPayment(
            data.paymentClientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false }
          )
          if (confirmError) {
            ev.complete("fail")
            setError(confirmError.message || "Payment failed.")
            return
          }
          ev.complete("success")
          try {
            await fetch("/api/checkout/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderNumber: data.orderNumber,
                paymentIntentId: data.paymentIntentId,
              }),
            })
          } catch {
            // ignore
          }
          onSuccess(data.orderId)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment failed.")
        } finally {
          setSubmitting(false)
          processingRef.current = false
        }
      })
    }
    void setup()
    return () => {
      cancelled = true
    }
  }, [stripe, amountPence, appealId, appealTitle, fundraiserId, donationType, isAnonymous, giftAid, onSuccess])

  React.useEffect(() => {
    if (paymentRequest && amountPence >= 100) {
      paymentRequest.update({ total: { label: "Donation", amount: amountPence } })
    }
  }, [paymentRequest, amountPence])

  if (!paymentRequest) {
    // Apple Pay / Google Pay not available on this device or amount too low
    return null
  }

  return (
    <div className="space-y-3">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              theme: "dark",
              height: "44px",
            },
          },
        }}
      />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-neutral-200 dark:border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase text-neutral-500 dark:text-muted-foreground">
          <span className="bg-white dark:bg-card px-2">Or pay with card</span>
        </div>
      </div>
      {submitting && <p className="text-sm text-muted-foreground">Completing payment…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function CardPaymentStep({
  orderId,
  orderNumber,
  paymentIntentId,
  amountPence,
  onSuccess,
  onBack,
}: {
  orderId: string
  orderNumber: string
  paymentIntentId: string
  amountPence: number
  onSuccess: () => void
  onBack: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaymentError(null)
    setSubmitting(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: typeof window !== "undefined" ? `${window.location.origin}/success/${orderId}` : undefined,
        },
      })
      if (error) {
        setPaymentError(error.message || "Payment failed.")
        return
      }
      try {
        await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, paymentIntentId }),
        })
      } catch {
        // ignore
      }
      onSuccess()
    } catch {
      setPaymentError("Payment failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-neutral-900 dark:text-foreground">Complete payment</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
      </div>
      <PaymentElement />
      {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-xl text-base font-semibold bg-primary text-primary-foreground"
      >
        {submitting ? "Processing…" : `Donate ${formatCurrencyWhole(amountPence)}`}
      </Button>
    </form>
  )
}
