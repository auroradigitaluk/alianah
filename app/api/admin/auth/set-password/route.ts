import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, validatePassword, setAdminSession } from "@/lib/admin-auth"
import { checkSetPasswordRateLimit, getClientIp } from "@/lib/rate-limit"
import { z } from "zod"

const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkSetPasswordRateLimit(`set-password:ip:${ip}`)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Too many attempts. Please try again later.",
          retryAfter: limit.retryAfter,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { token, password } = setPasswordSchema.parse(body)

    const validationError = validatePassword(password)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const now = new Date()

    const userByInvite = await prisma.adminUser.findFirst({
      where: {
        inviteToken: token,
        inviteExpiresAt: { gt: now },
      },
    })
    const userByReset = await prisma.adminUser.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiresAt: { gt: now },
      },
    })
    const user = userByInvite ?? userByReset

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired link. Please request a new invite or password reset." },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpiresAt: null,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    })

    await setAdminSession(user.email)

    return NextResponse.json({
      success: true,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("Set password error:", error)
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 })
  }
}
