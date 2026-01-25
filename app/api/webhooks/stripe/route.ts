import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import { finalizeOrderByOrderNumber } from "@/lib/payment-finalize"

// Lazy initialization to avoid errors during build when API key is not available
let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    stripe = new Stripe(apiKey, {
      // Stripe's TS types may not include preview API versions.
      apiVersion: "2024-12-18.acacia" as unknown as Stripe.LatestApiVersion,
    })
  }
  return stripe
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Webhook signature verification failed:", message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Find donation by order number
        const orderNumber = session.metadata?.orderNumber
        const paidAt = new Date()

        const isSubscriptionCheckout = session.mode === "subscription"
        const paymentRef = (isSubscriptionCheckout
          ? (session.subscription as string | null)
          : (session.payment_intent as string | null)) || null

        if (orderNumber) {
          let nextPaymentDate: Date | null = null
          if (isSubscriptionCheckout && paymentRef) {
            try {
              const subscription = (await getStripe().subscriptions.retrieve(paymentRef)) as unknown as Stripe.Subscription
              const currentPeriodEnd = (subscription as unknown as { current_period_end?: number | null }).current_period_end
              if (currentPeriodEnd) {
                nextPaymentDate = new Date(currentPeriodEnd * 1000)
              }
            } catch (err) {
              console.error("Error retrieving subscription:", err)
            }
          }

          await finalizeOrderByOrderNumber({
            orderNumber,
            paidAt,
            paymentRef,
            isSubscription: isSubscriptionCheckout,
            customerEmail: session.customer_email || null,
            nextPaymentDate,
          })
        }

        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        const orderNumber = paymentIntent.metadata?.orderNumber
        if (orderNumber) {
          await finalizeOrderByOrderNumber({
            orderNumber,
            paidAt: new Date(),
            paymentRef: paymentIntent.id,
            isSubscription: false,
            customerEmail: paymentIntent.receipt_email || null,
          })
        }

        break
      }

      case "invoice.payment_succeeded": {
        // Stripe's TS types vary by version; ensure `subscription` is accessible.
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null
          payment_intent?: string | Stripe.PaymentIntent | null
        }
        
        // Handle recurring donation payment
        if (invoice.subscription) {
          const subscriptionId = invoice.subscription as string

          try {
            const subscription = (await getStripe().subscriptions.retrieve(subscriptionId)) as unknown as Stripe.Subscription
            const orderNumber = (subscription.metadata as Record<string, string> | null)?.orderNumber
            const currentPeriodEnd = (subscription as unknown as { current_period_end?: number | null }).current_period_end
            const nextPaymentDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null
            const paymentIntentId =
              typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id

            if (orderNumber) {
              await finalizeOrderByOrderNumber({
                orderNumber,
                paidAt: new Date(),
                paymentRef: subscriptionId,
                isSubscription: true,
                customerEmail: null,
                nextPaymentDate,
              })
            }

            if (orderNumber && paymentIntentId) {
              await getStripe().paymentIntents.update(paymentIntentId, {
                description: `Donation ${orderNumber}`,
                metadata: { orderNumber },
              })
            }
          } catch (err) {
            console.error("Error handling invoice.payment_succeeded:", err)
          }
        }

        break
      }

      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        if (event.type === "customer.subscription.deleted") {
          const subscription = event.data.object as Stripe.Subscription
          if (subscription.id) {
            await prisma.recurringDonation.updateMany({
              where: { subscriptionId: subscription.id },
              data: { status: "FAILED" },
            })
          }
          break
        }

        // invoice.payment_failed -> Invoice object
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null
        }

        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id || null

        if (subscriptionId) {
          await prisma.recurringDonation.updateMany({
            where: { subscriptionId },
            data: { status: "FAILED" },
          })
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
