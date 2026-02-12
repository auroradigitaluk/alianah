import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkSetPasswordRateLimit, getClientIp } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  const limit = checkSetPasswordRateLimit(`verify-invite:ip:${ip}`)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later.", retryAfter: limit.retryAfter },
      { status: 429 }
    )
  }

  const token = request.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 })
  }

  const now = new Date()

  const inviteUser = await prisma.adminUser.findFirst({
    where: {
      inviteToken: token,
      inviteExpiresAt: { gt: now },
    },
    select: { email: true },
  })
  if (inviteUser) {
    return NextResponse.json({ email: inviteUser.email, type: "invite" })
  }

  const resetUser = await prisma.adminUser.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiresAt: { gt: now },
    },
    select: { email: true },
  })
  if (resetUser) {
    return NextResponse.json({ email: resetUser.email, type: "reset" })
  }

  return NextResponse.json(
    { error: "Invalid or expired link. Please request a new invite or password reset." },
    { status: 400 }
  )
}
