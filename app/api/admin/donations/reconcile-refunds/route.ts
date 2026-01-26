import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"

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

function isRefunded(paymentIntent: Stripe.PaymentIntent) {
  const refundedAmount = (paymentIntent as unknown as { amount_refunded?: number | null }).amount_refunded
  if (refundedAmount && refundedAmount > 0) return true
  const charge = paymentIntent.latest_charge as Stripe.Charge | null
  if (charge?.refunded) return true
  if (charge?.amount_refunded && charge.amount_refunded > 0) return true
  return false
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200)

  const donations = await prisma.donation.findMany({
    where: {
      status: "COMPLETED",
      transactionId: { startsWith: "pi_" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  let updated = 0
  const updatedOrders: string[] = []

  for (const donation of donations) {
    try {
      const paymentIntent = await getStripe().paymentIntents.retrieve(donation.transactionId!, {
        expand: ["latest_charge"],
      })
      if (!isRefunded(paymentIntent)) continue

      await prisma.donation.update({
        where: { id: donation.id },
        data: { status: "REFUNDED" },
      })
      updated += 1
      if (donation.orderNumber) updatedOrders.push(donation.orderNumber)
    } catch (error) {
      console.error(`Refund reconcile failed for ${donation.id}:`, error)
    }
  }

  return NextResponse.json({
    scanned: donations.length,
    updated,
    updatedOrders,
  })
}
