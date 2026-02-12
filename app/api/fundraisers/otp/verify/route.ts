import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { createFundraiserSessionToken } from "@/lib/fundraiser-auth"
import { checkOtpRateLimit, getClientIp } from "@/lib/rate-limit"

const verifyOTPSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const ipLimit = checkOtpRateLimit(`fundraiser-otp-verify:ip:${ip}`)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", retryAfter: ipLimit.retryAfter },
        { status: 429 }
      )
    }

    const body = await request.json()
    const data = verifyOTPSchema.parse(body)

    const emailLimit = checkOtpRateLimit(`fundraiser-otp-verify:email:${data.email}`)
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", retryAfter: emailLimit.retryAfter },
        { status: 429 }
      )
    }

    // Find valid OTP
    const otp = await prisma.fundraiserOTP.findFirst({
      where: {
        email: data.email,
        code: data.code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 })
    }

    // Mark OTP as used
    await prisma.fundraiserOTP.update({
      where: { id: otp.id },
      data: { used: true },
    })

    // Signed session token (email + exp), verified on every request
    const sessionToken = createFundraiserSessionToken(data.email)

    const cookieStore = await cookies()
    cookieStore.set("fundraiser_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    })

    return NextResponse.json({
      success: true,
      email: data.email,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("OTP verify error:", error)
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 })
  }
}
