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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recurring = await prisma.recurringDonation.findUnique({
      where: { id },
      select: { subscriptionId: true, status: true },
    })

    if (!recurring) {
      return NextResponse.json({ error: "Recurring donation not found" }, { status: 404 })
    }

    if (!recurring.subscriptionId) {
      return NextResponse.json({ error: "No Stripe subscription linked" }, { status: 400 })
    }

    // Cancel in Stripe (immediately). If you'd prefer end-of-period, use cancel_at_period_end.
    await getStripe().subscriptions.cancel(recurring.subscriptionId)

    await prisma.recurringDonation.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cancel subscription error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

