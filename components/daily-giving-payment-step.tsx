"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowRight, ChevronLeft, Moon } from "lucide-react"
import { CHECKOUT_COUNTRIES } from "@/lib/countries"
import { formatCurrency } from "@/lib/utils"
import { z } from "zod"

function capFirstLetter(s: string): string {
  if (!s.length) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const donorSchema = z.object({
  firstName: z.string().min(1, "First name is required").transform((s) => s.trim()),
  lastName: z.string().min(1, "Last name is required").transform((s) => s.trim()),
  email: z.string().min(1, "Email is required").email("Invalid email").transform((s) => s.trim().toLowerCase()),
  phone: z.string().optional(),
  address: z.string().min(1, "Address is required").transform((s) => s.trim()),
  city: z.string().min(1, "City is required").transform((s) => s.trim()),
  postcode: z.string().min(1, "Postcode is required").transform((s) => s.trim()),
  country: z.string().min(1, "Country is required"),
  giftAid: z.boolean().default(false),
  coverFees: z.boolean().default(false),
})

type DonorFormData = z.infer<typeof donorSchema>

type CheckoutItem = {
  appealId?: string
  appealTitle: string
  frequency: "ONE_OFF" | "DAILY"
  donationType: string
  amountPence: number
  dailyGivingEndDate?: string
  dailyGivingOddNightsOnly?: boolean
}

type CheckoutCreateResponse = {
  orderId: string
  orderNumber: string
  mode: "payment" | "subscription" | "mixed" | "setup"
  paymentClientSecret?: string
  subscriptionClientSecret?: string
  setupIntentClientSecret?: string
  paymentIntentId?: string
  subscriptionId?: string
  setupIntentId?: string
}

interface DailyGivingPaymentStepProps {
  items: CheckoutItem[]
  subtotalPence: number
  feesPence: number
  totalPence: number
  /** Total donation over full period (all days) for Gift Aid display. If not set, uses totalPence. */
  totalDonationOverPeriodPence?: number
  onSuccess: (orderId: string) => void
  onBack: () => void
}

const stripePromise =
  typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string"
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null

function PaymentConfirmInner(props: {
  clientSecret: string
  order: CheckoutCreateResponse
  validated: DonorFormData
  totalPence: number
  onBack: () => void
  onSuccess: (orderId: string) => void
}) {
  const { clientSecret, order, validated, totalPence, onBack, onSuccess } = props
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)

  const isSetupMode = order.mode === "setup"

    const handlePay = async (e: React.FormEvent) => {
      e.preventDefault()
      setPaymentError(null)
      if (!stripe || !elements) return
      setSubmitting(true)
      try {
        if (isSetupMode) {
          const { error } = await stripe.confirmSetup({
            elements,
            redirect: "if_required",
            confirmParams: {
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
            setPaymentError(error.message || "Failed to save payment method. Please try again.")
            return
          }
        } else {
          const { error } = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
            confirmParams: {
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
        }
        try {
          await fetch("/api/checkout/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderNumber: order.orderNumber,
              ...(order.paymentIntentId ? { paymentIntentId: order.paymentIntentId } : {}),
              ...(order.subscriptionId ? { subscriptionId: order.subscriptionId } : {}),
              ...(order.setupIntentId ? { setupIntentId: order.setupIntentId } : {}),
            }),
          })
        } catch {
          // ignore
        }
        onSuccess(order.orderId)
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Payment failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="rounded-xl border bg-card p-4 py-4 md:p-6">
        <div className="rounded-md border bg-background px-3 py-3">
          <PaymentElement />
        </div>
        {paymentError && <p className="text-sm text-destructive mt-2">{paymentError}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          Due now: <span className="font-medium text-foreground">{formatCurrency(totalPence)}</span>
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
          <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
            <ChevronLeft className="size-4 mr-1" />
            Back
          </Button>
          <Button type="submit" size="lg" disabled={submitting || !stripe || !elements}>
            {submitting ? "Processing..." : "Start Giving"}
          </Button>
        </div>
      </div>
    </form>
  )
}

export function DailyGivingPaymentStep({
  items,
  subtotalPence,
  feesPence,
  totalPence,
  totalDonationOverPeriodPence,
  onSuccess,
  onBack,
}: DailyGivingPaymentStepProps) {
  const giftAidTotalPence = totalDonationOverPeriodPence ?? totalPence
  const router = useRouter()
  const { resolvedTheme } = useTheme()
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
    coverFees: false,
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(false)
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [order, setOrder] = React.useState<CheckoutCreateResponse | null>(null)
  const [validatedSnapshot, setValidatedSnapshot] = React.useState<DonorFormData | null>(null)

  const countryOptions = React.useMemo(() => {
    const display = new Intl.DisplayNames(["en"], { type: "region" })
    return CHECKOUT_COUNTRIES.map((code) => ({
      code,
      label: display.of(code) || code,
    })).sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  const handleDonorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const raw = {
      ...formData,
      giftAid: Boolean(formData.giftAid),
      coverFees: Boolean(formData.coverFees),
    }
    const parsed = donorSchema.safeParse(raw)
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
    setLoading(true)
    try {
      const donorPayload = {
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
        coverFees: donor.coverFees,
      }
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            appealId: item.appealId,
            appealTitle: item.appealTitle,
            frequency: item.frequency,
            donationType: item.donationType,
            amountPence: item.amountPence,
            dailyGivingEndDate: item.dailyGivingEndDate ?? undefined,
            dailyGivingOddNightsOnly: item.dailyGivingOddNightsOnly ?? undefined,
          })),
          donor: donorPayload,
          subtotalPence,
          feesPence,
          totalPence,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create order")
      }
      const data = (await response.json()) as CheckoutCreateResponse
      const secret =
        data.subscriptionClientSecret ||
        data.paymentClientSecret ||
        data.setupIntentClientSecret ||
        null
      if (!secret) throw new Error("No payment session returned")
      setValidatedSnapshot(donor)
      setOrder(data)
      setClientSecret(secret)
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (clientSecret && order && validatedSnapshot && stripePromise) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        </div>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div className="h-full w-3/4 rounded-full bg-primary transition-all" aria-hidden />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Moon className="size-4" />
            Daily Giving
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Select payment method
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Choose or add a payment method to complete your daily giving.
          </p>
        </div>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: resolvedTheme === "dark" ? "night" : "stripe",
              variables: {
                colorPrimary: "oklch(0.574 0.259 142.38)",
                colorBackground: "hsl(var(--card))",
                colorText: "hsl(var(--foreground))",
                colorTextSecondary: "hsl(var(--muted-foreground))",
              },
            },
          }}
          key={clientSecret}
        >
          <PaymentConfirmInner
            clientSecret={clientSecret}
            order={order}
            validated={validatedSnapshot}
            totalPence={totalPence}
            onBack={() => {
              setClientSecret(null)
              setOrder(null)
              setValidatedSnapshot(null)
            }}
            onSuccess={(orderId) => {
              router.push(`/success/${orderId}`)
              onSuccess(orderId)
            }}
          />
        </Elements>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
      </div>
      <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
        <div className="h-full w-3/4 rounded-full bg-primary transition-all" aria-hidden />
      </div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
          <Moon className="size-4" />
          Daily Giving
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
          Almost there
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Fill in your details below, then add your payment method to complete your daily giving.
        </p>
      </div>
      <form onSubmit={handleDonorSubmit} className="space-y-4">
        {errors._form && (
          <p className="text-sm text-destructive">{errors._form}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dg-firstName">First name</Label>
            <Input
              id="dg-firstName"
              value={String(formData.firstName)}
              onChange={(e) => setFormData((p) => ({ ...p, firstName: capFirstLetter(e.target.value) }))}
              placeholder="First name"
              className={errors.firstName ? "border-destructive" : ""}
            />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dg-lastName">Last name</Label>
            <Input
              id="dg-lastName"
              value={String(formData.lastName)}
              onChange={(e) => setFormData((p) => ({ ...p, lastName: capFirstLetter(e.target.value) }))}
              placeholder="Last name"
              className={errors.lastName ? "border-destructive" : ""}
            />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dg-email">Email</Label>
            <Input
              id="dg-email"
              type="email"
              value={String(formData.email)}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dg-phone">Phone (optional)</Label>
            <Input
              id="dg-phone"
              type="tel"
              value={String(formData.phone)}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+44 7700 900000"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dg-address">Address</Label>
          <Input
            id="dg-address"
            value={String(formData.address)}
            onChange={(e) => setFormData((p) => ({ ...p, address: capFirstLetter(e.target.value) }))}
            placeholder="Street address"
            className={errors.address ? "border-destructive" : ""}
          />
          {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dg-city">City</Label>
            <Input
              id="dg-city"
              value={String(formData.city)}
              onChange={(e) => setFormData((p) => ({ ...p, city: capFirstLetter(e.target.value) }))}
              placeholder="City"
              className={errors.city ? "border-destructive" : ""}
            />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dg-postcode">Postcode</Label>
            <Input
              id="dg-postcode"
              value={String(formData.postcode)}
              onChange={(e) => setFormData((p) => ({ ...p, postcode: e.target.value.toUpperCase() }))}
              placeholder="Postcode"
              className={errors.postcode ? "border-destructive" : ""}
            />
            {errors.postcode && <p className="text-xs text-destructive">{errors.postcode}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dg-country">Country</Label>
          <select
            id="dg-country"
            value={String(formData.country)}
            onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {countryOptions.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Checkbox
            id="dg-giftAid"
            checked={Boolean(formData.giftAid)}
            onCheckedChange={(c) => setFormData((p) => ({ ...p, giftAid: c === true }))}
            className="mt-0.5"
          />
          <div className="space-y-1">
            <Label htmlFor="dg-giftAid" className="font-normal cursor-pointer text-sm">
              Do you pay tax in the UK?
            </Label>
            <p className="text-xs text-muted-foreground">
              We can claim an extra {formatCurrency(Math.round(giftAidTotalPence * 0.25))} from the government, at no cost to you.
            </p>
          </div>
        </div>
        {formData.giftAid && (
          <div className="rounded-lg border p-4 text-muted-foreground">
            <p className="text-sm font-normal">
              I confirm I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
            <ChevronLeft className="size-4 mr-1" />
            Back
          </Button>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Creating donation..." : (
              <>
                Final Step
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
