import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword, setAdminSession } from "@/lib/admin-auth"
import { checkLoginRateLimit, getClientIp } from "@/lib/rate-limit"
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

    // 2FA required
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { requiresTwoFactor: true, email: user.email },
        { status: 200 }
      )
    }

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
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
