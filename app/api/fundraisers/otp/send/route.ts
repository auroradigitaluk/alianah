import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendFundraiserOTPEmail } from "@/lib/email"
import { checkOtpRateLimit, getClientIp } from "@/lib/rate-limit"

const sendOTPSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const ipLimit = checkOtpRateLimit(`fundraiser-otp:ip:${ip}`)
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", retryAfter: ipLimit.retryAfter },
        { status: 429 }
      )
    }

    const body = await request.json()
    const data = sendOTPSchema.parse(body)

    const emailLimit = checkOtpRateLimit(`fundraiser-otp:email:${data.email}`)
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts for this email. Try again later.", retryAfter: emailLimit.retryAfter },
        { status: 429 }
      )
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete old unused OTPs for this email
    await prisma.fundraiserOTP.deleteMany({
      where: {
        email: data.email,
        used: false,
      },
    })

    // Create new OTP
    await prisma.fundraiserOTP.create({
      data: {
        email: data.email,
        code,
        expiresAt,
      },
    })

    // Send OTP email
    try {
      await sendFundraiserOTPEmail({
        email: data.email,
        code,
      })
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError)
      // Don't fail the request if email fails - OTP is still created
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    console.error("OTP send error:", error)
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 })
  }
}
