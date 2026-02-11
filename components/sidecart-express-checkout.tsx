"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentRequestButtonElement, useStripe } from "@stripe/react-stripe-js"
import { useSidecart } from "@/components/sidecart-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CartItem = {
  id: string
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

function stripItemId(item: CartItem) {
  const { id: _id, ...rest } = item
  return rest
}

function ExpressCheckoutInner({
  items,
  subtotalPence,
  totalPence,
  onWalletAvailable,
}: {
  items: CartItem[]
  subtotalPence: number
  totalPence: number
  onWalletAvailable?: (available: boolean) => void
}) {
  const stripe = useStripe()
  const router = useRouter()
  const { clearCart, setOpen } = useSidecart()
  const [paymentRequest, setPaymentRequest] = React.useState<ReturnType<
    NonNullable<ReturnType<typeof useStripe>>["paymentRequest"]
  > | null>(null)
  const [walletLabel, setWalletLabel] = React.useState<string | null>(null)
  const [expressEmail, setExpressEmail] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    onWalletAvailable?.(!!paymentRequest)
  }, [paymentRequest, onWalletAvailable])

  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      if (!stripe || totalPence <= 0) return
      const pr = stripe.paymentRequest({
        country: "GB",
        currency: "gbp",
        total: { label: "Total", amount: totalPence },
        requestPayerEmail: true,
      })
      const result = await pr.canMakePayment()
      if (cancelled) return
      if (result) {
        setPaymentRequest(pr)
        onWalletAvailable?.(true)
        if ((result as { applePay?: boolean }).applePay) setWalletLabel("Apple Pay")
        else if ((result as { googlePay?: boolean }).googlePay) setWalletLabel("Google Pay")
        else setWalletLabel("Pay")

        pr.on("paymentmethod", async (ev) => {
          try {
            if (!stripe) {
              ev.complete("fail")
              return
            }
            setSubmitting(true)
            setError(null)
            const email =
              (ev.paymentMethod.billing_details?.email as string | undefined)?.trim() ||
              expressEmail.trim()
            if (!email) {
              ev.complete("fail")
              setError("Email is required for your receipt.")
              return
            }

            const res = await fetch("/api/checkout/create-express", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: items.map(stripItemId),
                email,
                subtotalPence,
                coverFees: false,
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

            clearCart()
            setOpen(false)
            router.push(`/success/${data.orderId}`)
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment failed.")
            ev.complete("fail")
          } finally {
            setSubmitting(false)
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
  }, [stripe, totalPence, items, subtotalPence, expressEmail, clearCart, setOpen, router, onWalletAvailable])

  if (!paymentRequest) return null

  return (
    <div className="space-y-3">
      <Label htmlFor="express-email" className="text-xs text-muted-foreground">
        Email for receipt (optional if your wallet provides it)
      </Label>
      <Input
        id="express-email"
        type="email"
        placeholder="you@example.com"
        value={expressEmail}
        onChange={(e) => setExpressEmail(e.target.value)}
        className="h-9"
      />
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
      {error && <p className="text-sm text-destructive">{error}</p>}
      {submitting && (
        <p className="text-sm text-muted-foreground">Completing payment…</p>
      )}
    </div>
  )
}

export function SidecartExpressCheckout({
  items,
  subtotalPence,
  totalPence,
  stripePromise,
  onWalletAvailable,
}: {
  items: CartItem[]
  subtotalPence: number
  totalPence: number
  stripePromise: Promise<import("@stripe/stripe-js").Stripe | null>
  onWalletAvailable?: (available: boolean) => void
}) {
  return (
    <Elements stripe={stripePromise} options={{}}>
      <ExpressCheckoutInner
        items={items}
        subtotalPence={subtotalPence}
        totalPence={totalPence}
        onWalletAvailable={onWalletAvailable}
      />
    </Elements>
  )
}
