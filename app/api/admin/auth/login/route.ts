import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword, setAdminSession } from "@/lib/admin-auth"
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit"
import { sendAdminLoginOtpEmail } from "@/lib/email"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const ipLimit = checkLoginRateLimit(`login:ip:${ip}`)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: ipLimit.retryAfter,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const data = loginSchema.parse(body)
    const email = data.email.trim().toLowerCase()

    // Per-email lockout to prevent credential stuffing
    const emailLimit = checkLoginRateLimit(`login:email:${email}`)
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many failed attempts for this account. Try again later.",
          retryAfter: emailLimit.retryAfter,
        },
        { status: 429 }
      )
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Invite flow: user has no password yet
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Please set your password using the link sent to your email" },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(data.password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // If 2FA is disabled for this account, log in immediately (no OTP step)
    if (!user.twoFactorEnabled) {
      await setAdminSession(user.email)
      const now = new Date()
      await Promise.all([
        prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: now },
        }),
        prisma.auditLog.create({
          data: {
            adminUserId: user.id,
            action: "LOGIN",
            entityType: "session",
          },
        }),
      ])
      return NextResponse.json({
        success: true,
        email: user.email,
        role: user.role,
      })
    }

    // Require OTP: generate code, store, send email, redirect to OTP step
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.adminLoginOtp.deleteMany({
      where: { email: user.email, used: false },
    })

    await prisma.adminLoginOtp.create({
      data: { email: user.email, code, expiresAt },
    })

    try {
      await sendAdminLoginOtpEmail({ email: user.email, code })
    } catch (emailError) {
      console.error("Error sending admin OTP email:", emailError)
      return NextResponse.json(
        { error: "Failed to send login code. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { requiresTwoFactor: true, email: user.email },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
