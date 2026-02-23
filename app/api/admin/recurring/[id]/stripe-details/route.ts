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

/** GET live subscription data from Stripe for the recurring donation details dialog. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params

    const recurring = await prisma.recurringDonation.findUnique({
      where: { id },
      select: { subscriptionId: true },
    })

    if (!recurring?.subscriptionId) {
      return NextResponse.json(
        { error: "Recurring donation not found or has no Stripe subscription" },
        { status: 404 }
      )
    }

    const subscription = await getStripe().subscriptions.retrieve(recurring.subscriptionId)
    const currentPeriodEnd = (subscription as { current_period_end?: number }).current_period_end
    const cancelAt = (subscription as { cancel_at?: number | null }).cancel_at

    return NextResponse.json({
      status: subscription.status,
      nextPaymentDate: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      cancelAtPeriodEnd: Boolean((subscription as { cancel_at_period_end?: boolean }).cancel_at_period_end),
      cancelAt: cancelAt ? new Date(cancelAt * 1000).toISOString() : null,
    })
  } catch (error) {
    console.error("Stripe subscription details error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load subscription details" },
      { status: 500 }
    )
  }
}
