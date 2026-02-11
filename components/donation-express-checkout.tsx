"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js"

/** Single line item for create-express (no id). Same shape as sidecart items. */
export type DonationExpressItem = {
  appealId?: string
  appealTitle: string
  fundraiserId?: string
  productId?: string
  productName?: string
  frequency: "ONE_OFF" | "MONTHLY" | "YEARLY"
  donationType: "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
  amountPence: number
  isAnonymous?: boolean
  waterProjectId?: string
  waterProjectCountryId?: string
  plaqueName?: string
  sponsorshipProjectId?: string
  sponsorshipCountryId?: string
  sponsorshipProjectType?: string
}

const stripePromise =
  typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string"
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : null

function DonationExpressInner({
  item,
  amountPence,
  onWalletAvailable,
}: {
  item: DonationExpressItem
  amountPence: number
  onWalletAvailable?: (available: boolean) => void
}) {
  const stripe = useStripe()
  const router = useRouter()
  const [paymentRequest, setPaymentRequest] = React.useState<ReturnType<
    NonNullable<ReturnType<typeof useStripe>>["paymentRequest"]
  > | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  /** Prevent duplicate create-express + confirm (one payment per user action). */
  const processingRef = React.useRef(false)

  React.useEffect(() => {
    onWalletAvailable?.(!!paymentRequest)
  }, [paymentRequest, onWalletAvailable])

  // Create payment request when stripe is ready and amount is valid
  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      if (!stripe || amountPence <= 0) return
      const pr = stripe.paymentRequest({
        country: "GB",
        currency: "gbp",
        total: { label: "Donation", amount: amountPence },
        requestPayerEmail: true,
      })
      const result = await pr.canMakePayment()
      if (cancelled) return
      if (result) {
        setPaymentRequest(pr)
        onWalletAvailable?.(true)

        pr.on("paymentmethod", async (ev) => {
          if (processingRef.current) {
            ev.complete("fail")
            return
          }
          processingRef.current = true
          try {
            if (!stripe) {
              ev.complete("fail")
              return
            }
            setSubmitting(true)
            setError(null)
            const email = (ev.paymentMethod.billing_details?.email as string | undefined)?.trim()
            if (!email) {
              ev.complete("fail")
              setError("Add an email in your wallet for the receipt.")
              return
            }

            const bd = ev.paymentMethod.billing_details
            const fullName = (bd?.name as string | undefined)?.trim()
            let donorFirstName: string | undefined
            let donorLastName: string | undefined
            if (fullName) {
              const parts = fullName.split(/\s+/)
              donorFirstName = parts[0] ?? undefined
              donorLastName = parts.length > 1 ? parts.slice(1).join(" ") : undefined
            }
            const addr = bd?.address
            const donorAddress = (addr?.line1 as string | undefined)?.trim() || undefined
            const donorCity = (addr?.city as string | undefined)?.trim() || undefined
            const donorPostcode = (addr?.postal_code as string | undefined)?.trim() || undefined
            const donorCountry = (addr?.country as string | undefined)?.trim() || undefined

            const res = await fetch("/api/checkout/create-express", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: [item],
                email,
                subtotalPence: amountPence,
                coverFees: false,
                ...(donorFirstName && { donorFirstName }),
                ...(donorLastName && { donorLastName }),
                ...(donorAddress && { donorAddress }),
                ...(donorCity && { donorCity }),
                ...(donorPostcode && { donorPostcode }),
                ...(donorCountry && { donorCountry }),
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

            const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
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

            if (paymentIntent?.status === "requires_action") {
              const { error: actionError } = await stripe.confirmCardPayment(
                data.paymentClientSecret
              )
              if (actionError) {
                setError(actionError.message || "Payment failed.")
                return
              }
            }

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

            router.push(`/success/${data.orderId}`)
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment failed.")
            ev.complete("fail")
          } finally {
            setSubmitting(false)
            processingRef.current = false
          }
        })
      } else {
        onWalletAvailable?.(false)
      }
    }
    void setup()
    return () => {
      cancelled = true
    }
  }, [stripe, item, amountPence, router, onWalletAvailable])

  if (!paymentRequest) return null

  return (
    <div className="space-y-2">
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      {submitting && (
        <p className="text-sm text-muted-foreground">Completing payment…</p>
      )}
    </div>
  )
}

export function DonationExpressCheckout({
  item,
  amountPence,
  onWalletAvailable,
}: {
  item: DonationExpressItem
  amountPence: number
  onWalletAvailable?: (available: boolean) => void
}) {
  if (!stripePromise || amountPence <= 0) return null

  return (
    <Elements stripe={stripePromise} options={{}}>
      <DonationExpressInner
        item={item}
        amountPence={amountPence}
        onWalletAvailable={onWalletAvailable}
      />
    </Elements>
  )
}
