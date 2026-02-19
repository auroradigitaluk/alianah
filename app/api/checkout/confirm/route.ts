import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import Stripe from "stripe"
import { finalizeOrderByOrderNumber, finalizeOddNightsOrderByOrderNumber } from "@/lib/payment-finalize"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set")
    stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia" as unknown as Stripe.LatestApiVersion,
    })
  }
  return stripe
}

const schema = z.object({
  orderNumber: z.string().min(5),
  paymentIntentId: z.string().optional(),
  subscriptionId: z.string().optional(),
  setupIntentId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderNumber, paymentIntentId, subscriptionId, setupIntentId } = schema.parse(body)

    if (!paymentIntentId && !subscriptionId && !setupIntentId) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 })
    }

    const paidAt = new Date()

    if (subscriptionId) {
      const subscription = (await getStripe().subscriptions.retrieve(subscriptionId, {
        expand: ["latest_invoice.payment_intent"],
      })) as unknown as Stripe.Subscription
      // Stripe TS types vary by version; ensure `payment_intent` is accessible.
      const latestInvoice = subscription.latest_invoice as (Stripe.Invoice & {
        payment_intent?: string | Stripe.PaymentIntent | null
      }) | null
      const pi =
        latestInvoice && typeof latestInvoice.payment_intent !== "string"
          ? latestInvoice.payment_intent
          : null

      const currentPeriodEnd = (subscription as unknown as { current_period_end?: number | null }).current_period_end
      const nextPaymentDate =
        currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null

      if (!pi || (pi.status !== "succeeded" && pi.status !== "processing")) {
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
      }

      const customerEmail = (() => {
        const cust = (subscription as unknown as { customer?: unknown }).customer
        if (!cust || typeof cust === "string") return null
        if (typeof cust === "object" && cust !== null && "email" in cust) {
          const email = (cust as { email?: unknown }).email
          return typeof email === "string" ? email : null
        }
        return null
      })()

      await finalizeOrderByOrderNumber({
        orderNumber,
        paidAt,
        paymentRef: subscription.id,
        isSubscription: true,
        customerEmail,
        nextPaymentDate,
      })
    }

    if (paymentIntentId) {
      const pi = await getStripe().paymentIntents.retrieve(paymentIntentId)
      if (pi.status !== "succeeded" && pi.status !== "processing") {
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
      }

      await finalizeOrderByOrderNumber({
        orderNumber,
        paidAt,
        paymentRef: pi.id,
        isSubscription: false,
        customerEmail: pi.receipt_email || null,
      })
    }

    if (setupIntentId) {
      const si = await getStripe().setupIntents.retrieve(setupIntentId)
      if (si.status !== "succeeded") {
        return NextResponse.json({ error: "Setup not completed" }, { status: 400 })
      }
      await finalizeOddNightsOrderByOrderNumber({ orderNumber, setupIntentId: si.id })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("Confirm checkout error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}

