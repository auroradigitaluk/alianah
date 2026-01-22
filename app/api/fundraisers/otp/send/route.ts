import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendFundraiserOTPEmail } from "@/lib/email"

const sendOTPSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = sendOTPSchema.parse(body)

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
