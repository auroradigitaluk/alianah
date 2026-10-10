"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js"
import { donorDetailsFromPaymentRequestEvent } from "@/lib/wallet-donor"

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
  qurbaniCountryId?: string
  qurbaniSize?: "ONE_SEVENTH" | "SMALL" | "LARGE"
  qurbaniNames?: string
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
  /** Refs so the payment handler always uses current amount/item (e.g. after user changes £20 → £50). */
  const itemRef = React.useRef(item)
  const amountPenceRef = React.useRef(amountPence)
  itemRef.current = item
  amountPenceRef.current = amountPence

  React.useEffect(() => {
    onWalletAvailable?.(!!paymentRequest)
  }, [paymentRequest, onWalletAvailable])

  // Create payment request once when stripe is ready and amount is valid
  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      if (!stripe || amountPence <= 0 || paymentRequest) return
      const pr = stripe.paymentRequest({
        country: "GB",
        currency: "gbp",
        total: { label: "Donation", amount: amountPence },
        requestPayerName: true,
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
            const walletDonor = donorDetailsFromPaymentRequestEvent(ev)
            const email = walletDonor.email
            if (!email) {
              ev.complete("fail")
              setError("Add an email in your wallet for the receipt.")
              return
            }

            const currentItem = itemRef.current
            const currentAmount = amountPenceRef.current
            const res = await fetch("/api/checkout/create-express", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: [currentItem],
                email,
                subtotalPence: currentAmount,
                coverFees: false,
                ...(walletDonor.firstName && { donorFirstName: walletDonor.firstName }),
                ...(walletDonor.lastName && { donorLastName: walletDonor.lastName }),
                ...(walletDonor.address && { donorAddress: walletDonor.address }),
                ...(walletDonor.city && { donorCity: walletDonor.city }),
                ...(walletDonor.postcode && { donorPostcode: walletDonor.postcode }),
                ...(walletDonor.country && { donorCountry: walletDonor.country }),
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
  }, [stripe, amountPence, router, onWalletAvailable])

  // When amount changes, update the Payment Request so Apple Pay shows the new total
  React.useEffect(() => {
    if (paymentRequest && amountPence > 0) {
      paymentRequest.update({ total: { label: "Donation", amount: amountPence } })
    }
  }, [paymentRequest, amountPence])

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
