"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, PaymentRequestButtonElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useSidecart } from "@/components/sidecart-provider"
import { formatCurrency } from "@/lib/utils"
import { z } from "zod"

function toTitleCase(input: string) {
  const s = input.trim().replace(/\s+/g, " ")
  if (!s) return s
  return s
    .split(" ")
    .map((word) => {
      const w = word.trim()
      if (!w) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(" ")
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase()
}

function normalizeCountry(input: string) {
  const c = input.trim().toUpperCase()
  if (c === "UK") return "GB"
  return c
}

function normalizeUkPostcode(input: string) {
  const raw = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (raw.length <= 3) return raw
  return `${raw.slice(0, -3)} ${raw.slice(-3)}`
}

function isValidUkPostcode(postcode: string) {
  // UK postcode regex (broad, practical)
  const uk = /^([A-Z]{1,2}\d[A-Z\d]?)\s?(\d[A-Z]{2})$/i
  return uk.test(postcode.trim())
}

function normalizePhone(input: string) {
  // Keep + and digits; collapse spaces
  const trimmed = input.trim()
  if (!trimmed) return ""
  const cleaned = trimmed.replace(/[^\d+]/g, "")
  return cleaned
}

const checkoutSchema = z.object({
  fullName: z
    .string()
    .min(1, "Name is required")
    .transform((v) => toTitleCase(v)),
  email: z
    .string()
    .transform((v) => normalizeEmail(v))
    .pipe(z.string().email("Invalid email address")),
  phone: z
    .string()
    .optional()
    .transform((v) => (v ? normalizePhone(v) : "")),
  address: z
    .string()
    .min(1, "Address is required")
    .transform((v) => toTitleCase(v)),
  city: z
    .string()
    .min(1, "City is required")
    .transform((v) => toTitleCase(v)),
  postcode: z
    .string()
    .min(1, "Postcode is required")
    .transform((v) => normalizeUkPostcode(v)),
  country: z
    .string()
    .min(1, "Country is required")
    .transform((v) => normalizeCountry(v)),
  giftAid: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),
  coverFees: z.boolean().default(false),
})
  .superRefine((data, ctx) => {
    // Phone validation (optional): require 7-16 digits (after stripping formatting)
    if (data.phone) {
      const digits = data.phone.replace(/[^\d]/g, "")
      if (digits.length < 7 || digits.length > 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Invalid phone number",
        })
      }
    }

    // Postcode validation: treat GB as UK postcode
    if (data.country === "GB") {
      if (!isValidUkPostcode(data.postcode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["postcode"],
          message: "Invalid UK postcode",
        })
      }
    }
  })

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ")
  if (!trimmed) return { firstName: "", lastName: "" }
  const parts = trimmed.split(" ")
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" }
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") }
}

type CheckoutCreateResponse = {
  orderId: string
  orderNumber: string
  mode: "payment" | "subscription"
  clientSecret: string
  paymentIntentId?: string
  subscriptionId?: string
}

function PaymentStep(props: {
  clientSecret: string
  order: CheckoutCreateResponse
  validated: z.infer<typeof checkoutSchema>
  totalPence: number
  onBack: () => void
  onSuccess: (orderId: string) => void
}) {
  const { clientSecret, order, validated, totalPence, onBack, onSuccess } = props
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)
  const [paymentRequest, setPaymentRequest] = React.useState<ReturnType<
    NonNullable<ReturnType<typeof useStripe>>["paymentRequest"]
  > | null>(null)
  const [walletLabel, setWalletLabel] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      if (!stripe) return
      // Native wallet button (Apple Pay / Google Pay) when supported.
      const pr = stripe.paymentRequest({
        country: validated.country || "GB",
        currency: "gbp",
        total: { label: "Total", amount: totalPence },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: Boolean(validated.phone),
      })
      const result = await pr.canMakePayment()
      if (cancelled) return
      if (result) {
        setPaymentRequest(pr)
        if ((result as any).applePay) setWalletLabel("Apple Pay")
        else if ((result as any).googlePay) setWalletLabel("Google Pay")
        else setWalletLabel("Wallet Pay")

        pr.on("paymentmethod", async (ev) => {
          try {
            if (!stripe) throw new Error("Payment system not ready.")
            setSubmitting(true)
            setPaymentError(null)

            // Confirm the intent with the wallet-provided payment method.
            const { error, paymentIntent } = await stripe.confirmCardPayment(
              clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: false }
            )

            if (error) {
              ev.complete("fail")
              setPaymentError(error.message || "Payment failed. Please try again.")
              return
            }

            ev.complete("success")

            // Handle any additional actions (3DS)
            if (paymentIntent && paymentIntent.status === "requires_action") {
              const { error: actionError } = await stripe.confirmCardPayment(clientSecret)
              if (actionError) {
                setPaymentError(actionError.message || "Payment failed. Please try again.")
                return
              }
            }

            // Best-effort immediate finalize (webhook remains the source of truth)
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
              // ignore
            }

            onSuccess(order.orderId)
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Payment failed. Please try again.")
          } finally {
            setSubmitting(false)
          }
        })
      }
    }

    void setup()
    return () => {
      cancelled = true
    }
  }, [stripe, clientSecret, totalPence, validated.country, validated.phone, validated.email, validated.fullName, validated.address, validated.city, validated.postcode])

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentError(null)
    setSubmitting(true)
    try {
      if (!stripe || !elements) {
        throw new Error("Payment system not ready. Please try again.")
      }

      // Confirm without redirect; show inline errors.
      const confirm = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: validated.fullName,
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

      if (confirm.error) {
        setPaymentError(confirm.error.message || "Payment failed. Please try again.")
        return
      }

      // Best-effort immediate finalize (webhook remains the source of truth)
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
      <Card>
        <CardHeader>
          <CardTitle>Card details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentRequest && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{walletLabel ?? "Apple Pay / Google Pay"}</p>
              <div className="rounded-md border bg-background px-3 py-3">
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
              </div>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or pay by card</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <div className="rounded-md border bg-background px-3 py-3 pointer-events-auto">
            <PaymentElement />
          </div>
          {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
          <p className="text-xs text-muted-foreground">
            Total to pay: <span className="font-medium">{formatCurrency(totalPence)}</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
              Back
            </Button>
            <Button type="submit" size="lg" disabled={submitting || !stripe || !elements}>
              {submitting ? "Processing..." : "Pay now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function CheckoutInner(props: { stripePromise: ReturnType<typeof loadStripe> }) {
  const { stripePromise } = props
  const router = useRouter()
  const { items, clearCart } = useSidecart()
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    country: "GB",
    giftAid: false,
    marketingConsent: false,
    coverFees: false,
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [createdOrder, setCreatedOrder] = React.useState<CheckoutCreateResponse | null>(null)
  const [validatedSnapshot, setValidatedSnapshot] = React.useState<z.infer<typeof checkoutSchema> | null>(null)

  const subtotalPence = items.reduce((sum, item) => sum + item.amountPence, 0)
  const feesPence = formData.coverFees ? Math.round(subtotalPence * 0.012) + 20 : 0
  const totalPence = subtotalPence + feesPence

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const validated = checkoutSchema.parse(formData)
      const { firstName, lastName } = splitFullName(validated.fullName)
      
      setLoading(true)

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          donor: {
            ...validated,
            firstName,
            lastName,
            // Server schema expects these fields.
            marketingEmail: validated.marketingConsent,
            marketingSMS: false,
            // Use the billing address for both billing and donor address (keeps capture minimal).
            billingAddress: validated.address,
            billingCity: validated.city,
            billingPostcode: validated.postcode,
            billingCountry: validated.country,
          },
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
      setValidatedSnapshot(validated)
      setCreatedOrder(data)
      setClientSecret(data.clientSecret)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        // Surface non-field errors at top via a pseudo-field
        setErrors((prev) => ({
          ...prev,
          _form: error instanceof Error ? error.message : "An error occurred. Please try again.",
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:px-6">
        <Card>
          <CardContent className="p-6 sm:p-12 text-center">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Your basket is empty</h2>
            <Button asChild>
              <Link href="/">Browse Appeals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (clientSecret && createdOrder && validatedSnapshot) {
    // Render PaymentElement only after we have a client secret.
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 md:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

        <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-10">
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 order-1 lg:order-1">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
              key={clientSecret}
            >
              <PaymentStep
                clientSecret={clientSecret}
                order={createdOrder}
                validated={validatedSnapshot}
                totalPence={totalPence}
                onBack={() => {
                  setClientSecret(null)
                  setCreatedOrder(null)
                  setValidatedSnapshot(null)
                }}
                onSuccess={(orderId) => {
                  clearCart()
                  router.push(`/success/${orderId}`)
                }}
              />
            </Elements>
          </div>

          {/* Order Summary - Right Side (Desktop) - 30% - Sticky */}
          <div className="lg:sticky lg:top-20 lg:h-fit order-2 lg:order-2 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.appealTitle}</p>
                        {item.productName && (
                          <p className="text-muted-foreground">{item.productName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {item.frequency === "MONTHLY"
                            ? `${formatCurrency(item.amountPence)}/month`
                            : formatCurrency(item.amountPence)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotalPence)}</span>
                  </div>
                  {feesPence > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Fees</span>
                      <span>{formatCurrency(feesPence)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totalPence)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 md:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

      {errors._form && (
        <div className="mb-4">
          <p className="text-sm text-destructive">{errors._form}</p>
        </div>
      )}

      <form onSubmit={handleCreatePayment}>
        <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-10">
          {/* Checkout form - Left Side (Desktop) */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 order-1 lg:order-1">
            <Card>
              <CardHeader>
                <CardTitle>Billing details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    onBlur={() =>
                      setFormData((prev) => ({ ...prev, fullName: toTitleCase(prev.fullName) }))
                    }
                    required
                    autoComplete="name"
                  />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={() =>
                      setFormData((prev) => ({ ...prev, email: normalizeEmail(prev.email) }))
                    }
                    required
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onBlur={() =>
                      setFormData((prev) => ({ ...prev, phone: normalizePhone(prev.phone) }))
                    }
                    placeholder="+44..."
                    autoComplete="tel"
                    disabled={loading}
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    onBlur={() =>
                      setFormData((prev) => ({ ...prev, address: toTitleCase(prev.address) }))
                    }
                    placeholder="Address line 1"
                    required
                    autoComplete="address-line1"
                    disabled={loading}
                  />
                  {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      onBlur={() =>
                        setFormData((prev) => ({ ...prev, city: toTitleCase(prev.city) }))
                      }
                      required
                      autoComplete="address-level2"
                      disabled={loading}
                    />
                    {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode *</Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      onBlur={() =>
                        setFormData((prev) => ({ ...prev, postcode: normalizeUkPostcode(prev.postcode) }))
                      }
                      required
                      autoComplete="postal-code"
                      disabled={loading}
                    />
                    {errors.postcode && <p className="text-sm text-destructive">{errors.postcode}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    onBlur={() =>
                      setFormData((prev) => ({ ...prev, country: normalizeCountry(prev.country) }))
                    }
                    placeholder="GB"
                    required
                    autoComplete="country"
                    disabled={loading}
                  />
                  {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
                  <p className="text-xs text-muted-foreground">Use 2-letter country code (e.g. GB).</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gift Aid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Restored Gift Aid section (as before) */}
                <div className="bg-primary text-primary-foreground rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-base mb-1">
                      Boost your donation by 25% at no extra cost to you
                    </p>
                    <p className="text-sm text-primary-foreground/90">
                      If you&apos;re a UK taxpayer, you can claim Gift Aid. The government will add 25% to your donation - you don&apos;t need to pay anything extra!
                    </p>
                  </div>
                  <div className="bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-foreground/80">Your donation:</span>
                      <span className="font-medium text-primary-foreground">{formatCurrency(totalPence)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary-foreground/80">Government top-up (25%):</span>
                      <span
                        className={`font-medium ${
                          formData.giftAid ? "text-primary-foreground" : "text-primary-foreground/70"
                        }`}
                      >
                        +{formatCurrency(Math.round(totalPence * 0.25))}
                      </span>
                    </div>
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Total we receive:</span>
                      <span className={formData.giftAid ? "text-primary-foreground" : "text-primary-foreground/70"}>
                        {formatCurrency(Math.round(totalPence * 1.25))}
                      </span>
                    </div>
                    {!formData.giftAid && (
                      <p className="text-xs text-primary-foreground/80 pt-1">
                        Check the box below to claim Gift Aid
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="giftAid"
                    checked={formData.giftAid}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, giftAid: checked === true })
                    }
                  />
                  <Label htmlFor="giftAid" className="font-normal cursor-pointer">
                    I am a UK taxpayer and would like to claim Gift Aid
                  </Label>
                </div>
                {formData.giftAid && (
                  <>
                    <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                      <p className="mb-2">
                        I confirm I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.
                      </p>
                      <p>
                        Please notify us if you want to cancel this declaration, change your name or home address, or no longer pay sufficient tax on your income and/or capital gains.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketingConsent"
                    checked={formData.marketingConsent}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, marketingConsent: checked === true })
                    }
                    disabled={loading}
                  />
                  <Label htmlFor="marketingConsent" className="font-normal cursor-pointer">
                    I’d like to receive updates about appeals and campaigns
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Next, we’ll securely collect your card details using Stripe.
                </p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="coverFees"
                    checked={formData.coverFees}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, coverFees: checked === true })
                    }
                    disabled={loading}
                  />
                  <Label htmlFor="coverFees" className="font-normal cursor-pointer">
                    Cover Stripe processing fees
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary - Right Side (Desktop) - 30% - Sticky */}
          <div className="lg:sticky lg:top-20 lg:h-fit order-2 lg:order-2 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.appealTitle}</p>
                        {item.productName && (
                          <p className="text-muted-foreground">{item.productName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {item.frequency === "MONTHLY"
                            ? `${formatCurrency(item.amountPence)}/month`
                            : formatCurrency(item.amountPence)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotalPence)}</span>
                  </div>
                  {feesPence > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Fees</span>
                      <span>{formatCurrency(feesPence)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totalPence)}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Preparing payment..." : "Continue to payment"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function CheckoutPage() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:px-6">
        <Card>
          <CardContent className="p-6 sm:p-12 text-center">
            <h2 className="text-xl sm:text-2xl font-semibold mb-2">Payments not configured</h2>
            <p className="text-sm text-muted-foreground">
              Missing <span className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stripePromise = React.useMemo(() => loadStripe(publishableKey), [publishableKey])

  return <CheckoutInner stripePromise={stripePromise} />
}
