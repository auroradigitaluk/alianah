"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, PaymentRequestButtonElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSidecart } from "@/components/sidecart-provider"
import { CHECKOUT_COUNTRIES } from "@/lib/countries"
import { formatCurrency } from "@/lib/utils"
import { z } from "zod"
import { ChevronDownIcon } from "lucide-react"
import { getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js"

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

function toTitleCaseLive(input: string) {
  return input.replace(/(^|\s+)([A-Za-z])/g, (match, sep, letter) => `${sep}${letter.toUpperCase()}`)
}

function isValidName(input: string) {
  const value = input.trim()
  if (value.length < 2 || value.length > 60) return false
  return /^[A-Za-z][A-Za-z\s.'-]*$/.test(value)
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase()
}

function isValidEmail(input: string) {
  return z.string().email().safeParse(input).success
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

function normalizePhoneNumber(input: string) {
  return input.replace(/[^\d]/g, "")
}

function normalizePhoneCountryCode(input: string) {
  const cleaned = input.replace(/[^\d]/g, "")
  return cleaned ? `+${cleaned}` : ""
}

function isValidCity(input: string) {
  const value = input.trim()
  if (value.length < 2 || value.length > 60) return false
  return /^[A-Za-z][A-Za-z\s.'-]*$/.test(value)
}

function isValidPostcode(input: string, country: string) {
  const value = input.trim()
  if (!value) return false
  if (country === "GB") return isValidUkPostcode(value)
  return /^[A-Za-z0-9][A-Za-z0-9\s-]{1,9}$/.test(value)
}

const checkoutSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .refine((v) => isValidName(v), "Invalid first name")
    .transform((v) => toTitleCase(v)),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .refine((v) => isValidName(v), "Invalid last name")
    .transform((v) => toTitleCase(v)),
  email: z
    .string()
    .transform((v) => normalizeEmail(v))
    .pipe(z.string().email("Invalid email address")),
  phoneCountryCode: z
    .string()
    .min(1, "Country code is required")
    .transform((v) => normalizePhoneCountryCode(v)),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .transform((v) => normalizePhoneNumber(v)),
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
    const codeDigits = data.phoneCountryCode.replace(/[^\d]/g, "")
    const numberDigits = data.phoneNumber.replace(/[^\d]/g, "")
    if (codeDigits.length < 1 || codeDigits.length > 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneCountryCode"],
        message: "Invalid country code",
      })
    }
    const fullDigits = `${codeDigits}${numberDigits}`
    if (fullDigits.length < 7 || fullDigits.length > 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Invalid phone number",
      })
    }

    const fullPhone = buildPhoneNumber(data.phoneCountryCode, data.phoneNumber)
    const parsed = parsePhoneNumberFromString(fullPhone)
    if (!parsed || !parsed.isValid()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Invalid phone number",
      })
    } else if (parsed.countryCallingCode !== codeDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneCountryCode"],
        message: "Phone code does not match number",
      })
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
    } else if (!isValidPostcode(data.postcode, data.country)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["postcode"],
        message: "Invalid postcode",
      })
    }

    if (!isValidCity(data.city)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "Invalid city name",
      })
    }
  })

function buildFullName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ")
}

function buildPhoneNumber(countryCode: string, number: string): string {
  const code = normalizePhoneCountryCode(countryCode)
  const digits = normalizePhoneNumber(number)
  return `${code}${digits}`
}

type CheckoutCreateResponse = {
  orderId: string
  orderNumber: string
  mode: "payment" | "subscription" | "mixed"
  paymentClientSecret?: string
  subscriptionClientSecret?: string
  paymentIntentId?: string
  subscriptionId?: string
}

function PaymentStep(props: {
  clientSecret: string
  subscriptionClientSecret?: string | null
  order: CheckoutCreateResponse
  validated: z.infer<typeof checkoutSchema>
  totalPence: number
  recurringTotalPence: number
  recurringFrequency: "MONTHLY" | "YEARLY" | null
  isMixedCheckout: boolean
  onBack: () => void
  onSuccess: (orderId: string) => void
}) {
  const {
    clientSecret,
    subscriptionClientSecret,
    order,
    validated,
    totalPence,
    recurringTotalPence,
    recurringFrequency,
    isMixedCheckout,
    onBack,
    onSuccess,
  } = props
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = React.useState(false)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)
  const [paymentRequest, setPaymentRequest] = React.useState<ReturnType<
    NonNullable<ReturnType<typeof useStripe>>["paymentRequest"]
  > | null>(null)
  const [walletLabel, setWalletLabel] = React.useState<string | null>(null)

  const confirmRecurringPayment = React.useCallback(
    async (paymentMethodId: string) => {
      if (!stripe || !subscriptionClientSecret) return
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        subscriptionClientSecret,
        { payment_method: paymentMethodId },
        { handleActions: false }
      )
      if (error) {
        throw new Error(error.message || "Subscription payment failed. Please try again.")
      }
      if (paymentIntent && paymentIntent.status === "requires_action") {
        const { error: actionError } = await stripe.confirmCardPayment(subscriptionClientSecret)
        if (actionError) {
          throw new Error(actionError.message || "Subscription payment failed. Please try again.")
        }
      }
    },
    [stripe, subscriptionClientSecret]
  )

  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      if (!stripe) return
      // Native wallet button (Apple Pay / Google Pay) when supported.
      const pr = stripe.paymentRequest({
        country: validated.country || "GB",
        currency: "gbp",
        total: { label: isMixedCheckout ? "One-off total" : "Total", amount: totalPence },
        requestPayerName: true,
        requestPayerEmail: true,
    requestPayerPhone: true,
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

            if (isMixedCheckout && subscriptionClientSecret) {
              await confirmRecurringPayment(ev.paymentMethod.id)
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
  }, [
    stripe,
    clientSecret,
    totalPence,
    validated.country,
    validated.email,
    validated.firstName,
    validated.lastName,
    validated.address,
    validated.city,
    validated.postcode,
    isMixedCheckout,
    subscriptionClientSecret,
    confirmRecurringPayment,
  ])

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
              name: buildFullName(validated.firstName, validated.lastName),
              email: validated.email,
              phone: buildPhoneNumber(validated.phoneCountryCode, validated.phoneNumber),
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

      const paymentMethodId =
        typeof confirm.paymentIntent?.payment_method === "string"
          ? confirm.paymentIntent.payment_method
          : confirm.paymentIntent?.payment_method?.id || null

      if (isMixedCheckout && subscriptionClientSecret) {
        if (!paymentMethodId) {
          throw new Error("Unable to reuse payment method for subscription.")
        }
        await confirmRecurringPayment(paymentMethodId)
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
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Due now:{" "}
              <span className="font-medium">
                {formatCurrency(isMixedCheckout ? totalPence + recurringTotalPence : totalPence)}
              </span>
            </p>
            {isMixedCheckout && recurringFrequency && (
              <p>
                Charged now:{" "}
                <span className="font-medium">
                  {formatCurrency(totalPence)} one-off + {formatCurrency(recurringTotalPence)}/
                  {recurringFrequency === "YEARLY" ? "year" : "month"}
                </span>
              </p>
            )}
            {recurringTotalPence > 0 && recurringFrequency && !isMixedCheckout && (
              <p>
                Recurring total:{" "}
                <span className="font-medium">
                  {formatCurrency(recurringTotalPence)}/{recurringFrequency === "YEARLY" ? "year" : "month"}
                </span>
              </p>
            )}
          </div>
          {isMixedCheckout && recurringFrequency && (
            <p className="text-xs text-muted-foreground">
              Your card will be charged now and your {recurringFrequency === "YEARLY" ? "yearly" : "monthly"} donation
              will start today.
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
              Back
            </Button>
            <Button type="submit" size="lg" disabled={submitting || !stripe || !elements}>
              {submitting ? "Processing..." : "Donate now"}
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
  const { resolvedTheme } = useTheme()
  const { items, clearCart } = useSidecart()
  const formStorageKey = "checkout:billing-details"
  const [loading, setLoading] = React.useState(false)
  const [countryOpen, setCountryOpen] = React.useState(false)
  const [countryQuery, setCountryQuery] = React.useState("")
  const [phoneCodeOpen, setPhoneCodeOpen] = React.useState(false)
  const [phoneCodeQuery, setPhoneCodeQuery] = React.useState("")
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneCountryCode: "+44",
    phoneNumber: "",
    address: "",
    city: "",
    postcode: "",
    country: "GB",
    giftAid: false,
    marketingConsent: false,
    coverFees: false,
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [primaryClientSecret, setPrimaryClientSecret] = React.useState<string | null>(null)
  const [paymentClientSecret, setPaymentClientSecret] = React.useState<string | null>(null)
  const [subscriptionClientSecret, setSubscriptionClientSecret] = React.useState<string | null>(null)
  const [createdOrder, setCreatedOrder] = React.useState<CheckoutCreateResponse | null>(null)
  const [validatedSnapshot, setValidatedSnapshot] = React.useState<z.infer<typeof checkoutSchema> | null>(null)
  const clearFieldErrorIfValid = React.useCallback(
    (field: string, isValid: boolean) => {
      if (!isValid || !errors[field]) return
      setErrors((prev) => ({ ...prev, [field]: "" }))
    },
    [errors]
  )

  const countryOptions = React.useMemo(() => {
    const display = new Intl.DisplayNames(["en"], { type: "region" })
    const items = CHECKOUT_COUNTRIES
      .map((code) => {
        const name = display.of(code) || code
        return { code, label: name }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
    return items
  }, [])

  const phoneCodeOptions = React.useMemo(() => {
    const items = CHECKOUT_COUNTRIES
      .map((code) => {
        try {
          const callingCode = `+${getCountryCallingCode(code as any)}`
          return { code, label: callingCode, value: callingCode }
        } catch {
          return null
        }
      })
      .filter((item): item is { code: string; label: string; value: string } => Boolean(item))
      .sort((a, b) => a.label.localeCompare(b.label))
    const seen = new Set<string>()
    const unique = items.filter((item) => (seen.has(item.value) ? false : (seen.add(item.value), true)))
    const uk = items.find((item) => item.code === "GB")
    const rest = unique.filter((item) => item.code !== "GB")
    return uk ? [uk, ...rest] : unique
  }, [])

  const filteredCountries = React.useMemo(() => {
    const query = countryQuery.trim().toLowerCase()
    if (!query) return countryOptions
    return countryOptions.filter((country) =>
      country.label.toLowerCase().includes(query)
    )
  }, [countryOptions, countryQuery])

  const filteredPhoneCodes = React.useMemo(() => {
    const query = phoneCodeQuery.trim().toLowerCase()
    if (!query) return phoneCodeOptions
    return phoneCodeOptions.filter((item) =>
      item.label.toLowerCase().includes(query)
    )
  }, [phoneCodeOptions, phoneCodeQuery])

  const selectedCountryLabel =
    countryOptions.find((country) => country.code === formData.country)?.label ||
    "Select country"
  const selectedPhoneCodeLabel =
    phoneCodeOptions.find((item) => item.value === formData.phoneCountryCode)?.label ||
    formData.phoneCountryCode

  const oneOffItems = items.filter((item) => item.frequency === "ONE_OFF")
  const recurringItems = items.filter((item) => item.frequency !== "ONE_OFF")
  const recurringFrequency = (() => {
    const frequencies = new Set(recurringItems.map((item) => item.frequency))
    if (frequencies.size === 1) {
      return recurringItems[0]?.frequency === "YEARLY" ? "YEARLY" : "MONTHLY"
    }
    return null
  })()
  const oneOffSubtotalPence = oneOffItems.reduce((sum, item) => sum + item.amountPence, 0)
  const recurringSubtotalPence = recurringItems.reduce((sum, item) => sum + item.amountPence, 0)
  const subtotalPence = oneOffSubtotalPence + recurringSubtotalPence
  const feesPence = formData.coverFees ? Math.round(subtotalPence * 0.012) + 20 : 0
  let oneOffFeesPence = 0
  let recurringFeesPence = 0
  if (feesPence > 0) {
    if (recurringSubtotalPence === 0) {
      oneOffFeesPence = feesPence
    } else if (oneOffSubtotalPence === 0) {
      recurringFeesPence = feesPence
    } else if (subtotalPence > 0) {
      oneOffFeesPence = Math.round((feesPence * oneOffSubtotalPence) / subtotalPence)
      recurringFeesPence = feesPence - oneOffFeesPence
    }
  }
  const oneOffTotalPence = oneOffSubtotalPence + oneOffFeesPence
  const recurringTotalPence = recurringSubtotalPence + recurringFeesPence
  const totalPence = oneOffTotalPence + recurringTotalPence

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.sessionStorage.getItem(formStorageKey)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as Partial<typeof formData>
      setFormData((prev) => ({ ...prev, ...parsed }))
    } catch {
      // ignore corrupt storage
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(formStorageKey, JSON.stringify(formData))
  }, [formData])

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const validated = checkoutSchema.parse(formData)
      const fullPhone = buildPhoneNumber(validated.phoneCountryCode, validated.phoneNumber)
      
      setLoading(true)

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          donor: {
            firstName: validated.firstName,
            lastName: validated.lastName,
            email: validated.email,
            phone: fullPhone,
            address: validated.address,
            city: validated.city,
            postcode: validated.postcode,
            country: validated.country,
            // Server schema expects these fields.
            marketingEmail: validated.marketingConsent,
            marketingSMS: false,
            // Use the billing address for both billing and donor address (keeps capture minimal).
            billingAddress: validated.address,
            billingCity: validated.city,
            billingPostcode: validated.postcode,
            billingCountry: validated.country,
            giftAid: validated.giftAid,
            coverFees: validated.coverFees,
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
      const nextPaymentSecret = data.paymentClientSecret || null
      const nextSubscriptionSecret = data.subscriptionClientSecret || null
      setPaymentClientSecret(nextPaymentSecret)
      setSubscriptionClientSecret(nextSubscriptionSecret)
      setPrimaryClientSecret(nextPaymentSecret || nextSubscriptionSecret)
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

  if (primaryClientSecret && createdOrder && validatedSnapshot) {
    // Render PaymentElement only after we have a client secret.
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 md:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

        <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-10">
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 order-1 lg:order-1">
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: primaryClientSecret,
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
              key={`${primaryClientSecret}-${resolvedTheme ?? "system"}`}
            >
              <PaymentStep
                clientSecret={primaryClientSecret}
                subscriptionClientSecret={subscriptionClientSecret}
                order={createdOrder}
                validated={validatedSnapshot}
                totalPence={oneOffItems.length > 0 ? oneOffTotalPence : recurringTotalPence}
                recurringTotalPence={recurringTotalPence}
                recurringFrequency={recurringFrequency}
                isMixedCheckout={oneOffItems.length > 0 && recurringItems.length > 0}
                onBack={() => {
                  setPrimaryClientSecret(null)
                  setPaymentClientSecret(null)
                  setSubscriptionClientSecret(null)
                  setCreatedOrder(null)
                  setValidatedSnapshot(null)
                }}
                onSuccess={(orderId) => {
                  clearCart()
                  if (typeof window !== "undefined") {
                    window.sessionStorage.removeItem(formStorageKey)
                  }
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
                            : item.frequency === "YEARLY"
                            ? `${formatCurrency(item.amountPence)}/year`
                            : formatCurrency(item.amountPence)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  {oneOffItems.length > 0 && recurringItems.length > 0 ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">One-off subtotal</span>
                        <span>{formatCurrency(oneOffSubtotalPence)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {recurringFrequency === "YEARLY" ? "Yearly subtotal" : "Monthly subtotal"}
                        </span>
                        <span>{formatCurrency(recurringSubtotalPence)}</span>
                      </div>
                      {oneOffFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Processing fees (due now)</span>
                          <span>{formatCurrency(oneOffFeesPence)}</span>
                        </div>
                      )}
                      {recurringFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Processing fees ({recurringFrequency === "YEARLY" ? "yearly" : "monthly"})
                          </span>
                          <span>{formatCurrency(recurringFeesPence)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Due now</span>
                        <span>{formatCurrency(oneOffTotalPence + recurringTotalPence)}</span>
                      </div>
                    </>
                  ) : recurringItems.length > 0 ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(recurringSubtotalPence)}</span>
                      </div>
                      {recurringFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Processing Fees</span>
                          <span>{formatCurrency(recurringFeesPence)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Recurring total</span>
                        <span>
                          {formatCurrency(recurringTotalPence)}/
                          {recurringFrequency === "YEARLY" ? "year" : "month"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(oneOffSubtotalPence)}</span>
                      </div>
                      {oneOffFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Processing Fees</span>
                          <span>{formatCurrency(oneOffFeesPence)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(oneOffTotalPence)}</span>
                      </div>
                    </>
                  )}
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => {
                        const next = toTitleCaseLive(e.target.value)
                        setFormData({ ...formData, firstName: next })
                        clearFieldErrorIfValid("firstName", isValidName(next))
                      }}
                      required
                      autoComplete="given-name"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => {
                        const next = toTitleCaseLive(e.target.value)
                        setFormData({ ...formData, lastName: next })
                        clearFieldErrorIfValid("lastName", isValidName(next))
                      }}
                      required
                      autoComplete="family-name"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value })
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: "" }))
                      }
                    }}
                    onBlur={() =>
                      setFormData((prev) => {
                        const normalized = normalizeEmail(prev.email)
                        if (!normalized) return { ...prev, email: normalized }
                        if (!isValidEmail(normalized)) {
                          setErrors((curr) => ({
                            ...curr,
                            email: "Invalid email address",
                          }))
                        }
                        return { ...prev, email: normalized }
                      })
                    }
                    required
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <div className="flex gap-2">
                    <Popover open={phoneCodeOpen} onOpenChange={setPhoneCodeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-40 justify-between"
                          disabled={loading}
                        >
                          <span className="truncate">{selectedPhoneCodeLabel}</span>
                          <ChevronDownIcon className="h-4 w-4 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
                        <Input
                          value={phoneCodeQuery}
                          onChange={(e) => setPhoneCodeQuery(e.target.value)}
                          placeholder="Search code..."
                          className="h-9"
                        />
                        <div className="mt-2 max-h-64 overflow-auto">
                          {filteredPhoneCodes.length === 0 ? (
                            <p className="px-2 py-2 text-sm text-muted-foreground">
                              No matching codes
                            </p>
                          ) : (
                            filteredPhoneCodes.map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, phoneCountryCode: item.value })
                                  setPhoneCodeOpen(false)
                                  setPhoneCodeQuery("")
                                  if (errors.phoneCountryCode || errors.phoneNumber) {
                                    setErrors((prev) => ({ ...prev, phoneCountryCode: "", phoneNumber: "" }))
                                  }
                                }}
                            onBlur={() => {
                              const fullPhone = buildPhoneNumber(
                                formData.phoneCountryCode,
                                formData.phoneNumber
                              )
                              const parsed = parsePhoneNumberFromString(fullPhone)
                              if (!parsed || !parsed.isValid()) {
                                setErrors((prev) => ({ ...prev, phoneNumber: "Invalid phone number" }))
                              }
                            }}
                                className="w-full text-left px-2 py-2 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground"
                              >
                                {item.label}
                              </button>
                            ))
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          phoneNumber: normalizePhoneNumber(e.target.value),
                        })
                        if (errors.phoneNumber) {
                          setErrors((prev) => ({ ...prev, phoneNumber: "" }))
                        }
                      }}
                    onBlur={() => {
                      const fullPhone = buildPhoneNumber(
                        formData.phoneCountryCode,
                        formData.phoneNumber
                      )
                      const parsed = parsePhoneNumberFromString(fullPhone)
                      if (!parsed || !parsed.isValid()) {
                        setErrors((prev) => ({ ...prev, phoneNumber: "Invalid phone number" }))
                      }
                    }}
                      placeholder="Phone number"
                      autoComplete="tel"
                      disabled={loading}
                      className="h-11 flex-1"
                      required
                    />
                  </div>
                  {(errors.phoneCountryCode || errors.phoneNumber) && (
                    <p className="text-sm text-destructive">
                      {errors.phoneCountryCode || errors.phoneNumber}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => {
                      const next = toTitleCaseLive(e.target.value)
                      setFormData({ ...formData, address: next })
                      clearFieldErrorIfValid("address", next.trim().length > 0)
                    }}
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
                      onChange={(e) => {
                        const next = toTitleCaseLive(e.target.value)
                        setFormData({ ...formData, city: next })
                        clearFieldErrorIfValid("city", next.trim().length > 0 && isValidCity(next))
                      }}
                      onBlur={() =>
                        setFormData((prev) => {
                          const next = toTitleCase(prev.city)
                          if (next && !isValidCity(next)) {
                            setErrors((curr) => ({ ...curr, city: "Invalid city name" }))
                          }
                          return { ...prev, city: next }
                        })
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
                      onChange={(e) => {
                        const next = normalizeUkPostcode(e.target.value)
                        setFormData({ ...formData, postcode: next })
                        clearFieldErrorIfValid("postcode", next.trim().length > 0 && isValidPostcode(next, formData.country))
                      }}
                      onBlur={() =>
                        setFormData((prev) => {
                          const next = normalizeUkPostcode(prev.postcode)
                          if (next && !isValidPostcode(next, formData.country)) {
                            setErrors((curr) => ({ ...curr, postcode: "Invalid postcode" }))
                          }
                          return { ...prev, postcode: next }
                        })
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
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 justify-between"
                        disabled={loading}
                      >
                        <span className="truncate">{selectedCountryLabel}</span>
                        <ChevronDownIcon className="h-4 w-4 opacity-60" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
                      <Input
                        value={countryQuery}
                        onChange={(e) => setCountryQuery(e.target.value)}
                        placeholder="Search country..."
                        className="h-9"
                      />
                      <div className="mt-2 max-h-64 overflow-auto">
                        {filteredCountries.length === 0 ? (
                          <p className="px-2 py-2 text-sm text-muted-foreground">
                            No matching countries
                          </p>
                        ) : (
                          filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                const nextCountry = normalizeCountry(country.code)
                                setFormData({ ...formData, country: nextCountry })
                                setCountryOpen(false)
                                setCountryQuery("")
                                clearFieldErrorIfValid("country", true)
                                if (formData.postcode.trim() && isValidPostcode(formData.postcode, nextCountry)) {
                                  setErrors((prev) => ({ ...prev, postcode: "" }))
                                }
                              }}
                              className="w-full text-left px-2 py-2 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {country.label}
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
                  <p className="text-xs text-muted-foreground">Select your country.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gift Aid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Restored Gift Aid section (as before) */}
                <div className="bg-card text-card-foreground rounded-lg p-4 space-y-3 border">
                  <div>
                    <p className="font-semibold text-base mb-1 text-foreground">
                      Boost your donation by 25% at no extra cost to you
                    </p>
                    <p className="text-sm text-foreground/80">
                      If you&apos;re a UK taxpayer, you can claim Gift Aid. The government will add 25% to your donation - you don&apos;t need to pay anything extra!
                    </p>
                  </div>
                  <div className="bg-primary text-primary-foreground rounded-lg p-3 space-y-2">
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
                            : item.frequency === "YEARLY"
                            ? `${formatCurrency(item.amountPence)}/year`
                            : formatCurrency(item.amountPence)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  {oneOffItems.length > 0 && recurringItems.length > 0 ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">One-off subtotal</span>
                        <span>{formatCurrency(oneOffSubtotalPence)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {recurringFrequency === "YEARLY" ? "Yearly subtotal" : "Monthly subtotal"}
                        </span>
                        <span>{formatCurrency(recurringSubtotalPence)}</span>
                      </div>
                      {oneOffFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Processing fees (due now)</span>
                          <span>{formatCurrency(oneOffFeesPence)}</span>
                        </div>
                      )}
                      {recurringFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Processing fees ({recurringFrequency === "YEARLY" ? "yearly" : "monthly"})
                          </span>
                          <span>{formatCurrency(recurringFeesPence)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Due now</span>
                        <span>{formatCurrency(oneOffTotalPence + recurringTotalPence)}</span>
                      </div>
                    </>
                  ) : recurringItems.length > 0 ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(recurringSubtotalPence)}</span>
                      </div>
                      {recurringFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Processing Fees</span>
                          <span>{formatCurrency(recurringFeesPence)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Recurring total</span>
                        <span>
                          {formatCurrency(recurringTotalPence)}/
                          {recurringFrequency === "YEARLY" ? "year" : "month"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(oneOffSubtotalPence)}</span>
                      </div>
                      {oneOffFeesPence > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Processing Fees</span>
                          <span>{formatCurrency(oneOffFeesPence)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(oneOffTotalPence)}</span>
                      </div>
                    </>
                  )}
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
