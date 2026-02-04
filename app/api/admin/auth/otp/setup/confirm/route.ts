import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuth } from "@/lib/admin-auth"
import speakeasy from "speakeasy"
import { z } from "zod"

const confirmSchema = z.object({
  code: z.string().length(6),
})

export async function POST(request: NextRequest) {
  let userId: string
  try {
    const user = await requireAdminAuth()
    userId = user.id
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { code } = confirmSchema.parse(body)

    const dbUser = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    })

    if (!dbUser?.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA setup not started. Please start the setup first." },
        { status: 400 }
      )
    }

    const valid = speakeasy.totp.verify({
      secret: dbUser.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1,
    })

    if (!valid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    await prisma.adminUser.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("2FA confirm error:", error)
    return NextResponse.json({ error: "Failed to enable 2FA" }, { status: 500 })
  }
}
