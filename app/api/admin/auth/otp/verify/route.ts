import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { setAdminSession } from "@/lib/admin-auth"
import { checkOtpRateLimit, getClientIp } from "@/lib/rate-limit"
import speakeasy from "speakeasy"
import { z } from "zod"

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkOtpRateLimit(`otp:ip:${ip}`)
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Too many verification attempts. Please try again later.",
          retryAfter: limit.retryAfter,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const data = verifySchema.parse(body)
    const email = data.email.trim().toLowerCase()

    const emailLimit = checkOtpRateLimit(`otp:email:${email}`)
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many failed attempts. Try again later.",
          retryAfter: emailLimit.retryAfter,
        },
        { status: 429 }
      )
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: data.code,
      window: 1,
    })

    if (!valid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 })
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
    console.error("2FA verify error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
