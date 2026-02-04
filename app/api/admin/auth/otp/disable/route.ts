import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuth, requireAdminRole } from "@/lib/admin-auth"
import { z } from "zod"

const disableSchema = z.object({
  userId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { userId } = disableSchema.parse(body)

    let targetUserId: string
    if (userId) {
      await requireAdminRole(["ADMIN"])
      targetUserId = userId
    } else {
      const user = await requireAdminAuth()
      targetUserId = user.id
    }

    await prisma.adminUser.update({
      where: { id: targetUserId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("2FA disable error:", error)
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 })
  }
}
