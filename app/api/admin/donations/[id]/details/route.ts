import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

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

async function getStripeInfo(transactionId?: string | null) {
  if (!transactionId) return null

  if (transactionId.startsWith("pi_")) {
    const paymentIntent = await getStripe().paymentIntents.retrieve(transactionId, {
      expand: ["latest_charge"],
    })
    const charge = paymentIntent.latest_charge as Stripe.Charge | null

    const balanceTransaction =
      typeof charge?.balance_transaction === "string"
        ? await getStripe().balanceTransactions.retrieve(charge.balance_transaction)
        : (charge?.balance_transaction as Stripe.BalanceTransaction | null)

    return {
      paymentIntentId: paymentIntent.id,
      chargeId: charge?.id || null,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      description: paymentIntent.description,
      receiptEmail: paymentIntent.receipt_email,
      paymentMethodTypes: paymentIntent.payment_method_types,
      card: charge?.payment_method_details?.card
        ? {
            brand: charge.payment_method_details.card.brand,
            last4: charge.payment_method_details.card.last4,
            expMonth: charge.payment_method_details.card.exp_month,
            expYear: charge.payment_method_details.card.exp_year,
            funding: charge.payment_method_details.card.funding,
            country: charge.payment_method_details.card.country,
            network: charge.payment_method_details.card.network,
          }
        : null,
      riskLevel: charge?.outcome?.risk_level || null,
      riskScore: charge?.outcome?.risk_score ?? null,
      fees: balanceTransaction?.fee ?? null,
      net: balanceTransaction?.net ?? null,
      refunded: charge?.refunded ?? null,
      amountRefunded: charge?.amount_refunded ?? null,
    }
  }

  if (transactionId.startsWith("sub_")) {
    const subscription = (await getStripe().subscriptions.retrieve(transactionId, {
      expand: ["latest_invoice.payment_intent"],
    })) as Stripe.Subscription
    const paymentIntent =
      typeof subscription.latest_invoice === "object" && subscription.latest_invoice
        ? (subscription.latest_invoice as Stripe.Invoice & {
            payment_intent?: string | Stripe.PaymentIntent | null
          }).payment_intent
        : null
    const paymentIntentId =
      typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id || null

    return {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      nextPaymentDate: (subscription as unknown as { current_period_end?: number | null }).current_period_end
        ? new Date((subscription as unknown as { current_period_end?: number | null }).current_period_end! * 1000).toISOString()
        : null,
      paymentIntentId,
    }
  }

  return null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params

    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        donor: true,
        appeal: { select: { title: true } },
        product: { select: { name: true } },
        fundraiser: {
          select: {
            fundraiserName: true,
            title: true,
            slug: true,
            waterProjectId: true,
            waterProject: { select: { projectType: true } },
            waterProjectCountry: { select: { country: true } },
          },
        },
      },
    })

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    }

    const order = donation.orderNumber
      ? await prisma.demoOrder.findUnique({
          where: { orderNumber: donation.orderNumber },
        })
      : null

    let stripeInfo = null
    try {
      stripeInfo = await getStripeInfo(donation.transactionId)
    } catch (error) {
      console.error("Error loading Stripe info:", error)
    }

    return NextResponse.json({
      donation,
      order,
      stripe: stripeInfo,
    })
  } catch (error) {
    console.error("Error loading donation details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
