import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"
import { sendRefundConfirmationEmail } from "@/lib/email"

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
  if (!transactionId.startsWith("pi_")) return null

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const schema = z.object({
      type: z.enum(["full", "partial"]).default("full"),
      amountPence: z.number().int().positive().optional(),
      reason: z.string().min(2),
    })
    const { type, amountPence, reason } = schema.parse(body)

    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        donor: true,
      },
    })

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    }

    if (!donation.transactionId) {
      return NextResponse.json({ error: "No Stripe payment reference found" }, { status: 400 })
    }

    if (!donation.transactionId.startsWith("pi_")) {
      return NextResponse.json(
        { error: "Refunds are only supported for one-off Stripe payments." },
        { status: 400 }
      )
    }

    const paymentIntent = (await getStripe().paymentIntents.retrieve(donation.transactionId)) as Stripe.PaymentIntent
    if (type === "partial") {
      if (!amountPence) {
        return NextResponse.json({ error: "Missing refund amount" }, { status: 400 })
      }
      const refundedAmount = (paymentIntent as unknown as { amount_refunded?: number | null }).amount_refunded || 0
      if (amountPence > paymentIntent.amount - refundedAmount) {
        return NextResponse.json({ error: "Refund amount exceeds remaining balance" }, { status: 400 })
      }
    }

    await getStripe().refunds.create({
      payment_intent: donation.transactionId,
      ...(type === "partial" ? { amount: amountPence } : {}),
      metadata: { reason },
    })

    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: "REFUNDED" },
    })

    const stripeInfo = await getStripeInfo(donation.transactionId)

    try {
      await sendRefundConfirmationEmail({
        donorEmail: donation.donor.email,
        donorName: `${donation.donor.firstName} ${donation.donor.lastName}`.trim() || "there",
        amountPence: type === "partial" && amountPence ? amountPence : donation.amountPence,
        orderNumber: donation.orderNumber,
        donateUrl: "https://alianah.org",
      })
    } catch (error) {
      console.error("Refund email failed:", error)
    }

    return NextResponse.json({
      donation: await prisma.donation.findUnique({ where: { id: donation.id } }),
      order: donation.orderNumber
        ? await prisma.demoOrder.findUnique({ where: { orderNumber: donation.orderNumber } })
        : null,
      stripe: stripeInfo,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid refund request" }, { status: 400 })
    }
    console.error("Error processing refund:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
