import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

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

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200)

  const donations = await prisma.donation.findMany({
    where: {
      status: { in: ["COMPLETED", "REFUNDED"] },
      transactionId: { startsWith: "pi_" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  let updated = 0
  let partiallyUpdated = 0
  const updatedOrders: string[] = []

  for (const donation of donations) {
    try {
      const paymentIntent = await getStripe().paymentIntents.retrieve(donation.transactionId!, {
        expand: ["latest_charge"],
      })

      const totalAmount =
        (paymentIntent as unknown as { amount?: number | null }).amount ?? 0
      const refundedFromPi =
        (paymentIntent as unknown as { amount_refunded?: number | null }).amount_refunded ?? 0
      const charge = paymentIntent.latest_charge as Stripe.Charge | null
      const refundedFromCharge =
        (charge as unknown as { amount_refunded?: number | null })?.amount_refunded ?? 0

      const refundedAmount = Math.max(refundedFromPi, refundedFromCharge)

      if (!totalAmount || refundedAmount <= 0) continue

      if (refundedAmount >= totalAmount) {
        // Fully refunded: ensure status is REFUNDED so it no longer counts.
        await prisma.donation.update({
          where: { id: donation.id },
          data: { status: "REFUNDED" },
        })
        updated += 1
      } else {
        // Partially refunded: keep as COMPLETED but reduce amount so totals
        // reflect the remaining value instead of dropping the donation.
        const remaining = totalAmount - refundedAmount
        await prisma.donation.update({
          where: { id: donation.id },
          data: {
            status: "COMPLETED",
            amountPence: remaining,
          },
        })
        partiallyUpdated += 1
      }

      if (donation.orderNumber) updatedOrders.push(donation.orderNumber)
    } catch (error) {
      console.error(`Refund reconcile failed for ${donation.id}:`, error)
    }
  }

  return NextResponse.json({
    scanned: donations.length,
    updated,
    partiallyUpdated,
    updatedOrders,
  })
}
