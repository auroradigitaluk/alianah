import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuth } from "@/lib/admin-auth"
import speakeasy from "speakeasy"
import QRCode from "qrcode"

export async function POST(request: NextRequest) {
  let user: { id: string; email: string }
  try {
    user = await requireAdminAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const generated = speakeasy.generateSecret({
      name: `Alianah Admin (${user.email})`,
      issuer: "Alianah",
    })

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: generated.base32,
        twoFactorEnabled: false,
      },
    })

    const otpauthUrl = generated.otpauth_url
    if (!otpauthUrl) {
      throw new Error("Failed to generate OTP URL")
    }
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl)

    return NextResponse.json({ qrDataUrl })
  } catch (error) {
    console.error("2FA setup error:", error)
    return NextResponse.json({ error: "Failed to generate 2FA setup" }, { status: 500 })
  }
}
