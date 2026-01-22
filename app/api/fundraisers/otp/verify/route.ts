import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { cookies } from "next/headers"
import { nanoid } from "nanoid"

const verifyOTPSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = verifyOTPSchema.parse(body)

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

    // Create session token
    const sessionToken = nanoid(32)

    // Store session in cookies
    const cookieStore = await cookies()
    cookieStore.set("fundraiser_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    })
    
    // Store email in separate cookie for easy access
    cookieStore.set("fundraiser_email", data.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
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
