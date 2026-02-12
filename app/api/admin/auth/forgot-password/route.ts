import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAdminPasswordResetEmail } from "@/lib/email"
import { checkSetPasswordRateLimit, getClientIp } from "@/lib/rate-limit"
import { nanoid } from "nanoid"
import { z } from "zod"

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address"),
})

const RESET_EXPIRY_HOURS = 1

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limit = checkSetPasswordRateLimit(`forgot-password:ip:${ip}`)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later.", retryAfter: limit.retryAfter },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email } = bodySchema.parse(body)
    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, passwordHash: true },
    })

    if (user?.passwordHash) {
      const token = nanoid(32)
      const expiresAt = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000)

      await prisma.adminUser.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpiresAt: expiresAt,
        },
      })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const resetPasswordUrl = `${baseUrl}/login/set-password?token=${token}`

      try {
        await sendAdminPasswordResetEmail({
          email: user.email,
          resetPasswordUrl,
        })
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError)
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { passwordResetToken: null, passwordResetExpiresAt: null },
        })
        return NextResponse.json(
          { error: "Failed to send email. Please try again later." },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message:
        "If an account exists with that email, we've sent a password reset link. Check your inbox and spam folder.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      )
    }
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
