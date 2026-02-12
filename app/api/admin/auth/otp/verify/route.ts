import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { setAdminSession } from "@/lib/admin-auth"
import { checkOtpRateLimit, getClientIp } from "@/lib/rate-limit"
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

    const otp = await prisma.adminLoginOtp.findFirst({
      where: {
        email,
        code: data.code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 })
    }

    await prisma.adminLoginOtp.update({
      where: { id: otp.id },
      data: { used: true },
    })

    const user = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
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
    console.error("OTP verify error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
