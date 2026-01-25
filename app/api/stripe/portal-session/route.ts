import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { verifyPortalToken } from "@/lib/portal-token"

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
  token: z.string().min(10),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = schema.parse(body)

    const verified = verifyPortalToken(token)
    if (!verified) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 })
    }

    const email = verified.email

    const recurring = await prisma.recurringDonation.findFirst({
      where: {
        subscriptionId: { not: null },
        donor: { email },
      },
      orderBy: { updatedAt: "desc" },
      select: { subscriptionId: true },
    })

    if (!recurring?.subscriptionId) {
      return NextResponse.json({ error: "No active subscription found for this email" }, { status: 404 })
    }

    const subscription = await getStripe().subscriptions.retrieve(recurring.subscriptionId)
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id

    if (!customerId) {
      return NextResponse.json({ error: "Unable to locate customer" }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/manage-subscription?done=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("Portal session error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}

