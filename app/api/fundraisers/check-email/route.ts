import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const emailParam = request.nextUrl.searchParams.get("email")
    const email = (emailParam || "").trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const existingFundraiser = await prisma.fundraiser.findFirst({
      where: { email },
      select: { id: true },
    })

    const sessionEmail = await getFundraiserEmail()
    const requiresLogin = Boolean(existingFundraiser && (!sessionEmail || sessionEmail !== email))

    return NextResponse.json({
      exists: Boolean(existingFundraiser),
      requiresLogin,
    })
  } catch (error) {
    console.error("Fundraiser email check error:", error)
    return NextResponse.json({ error: "Failed to check email" }, { status: 500 })
  }
}
