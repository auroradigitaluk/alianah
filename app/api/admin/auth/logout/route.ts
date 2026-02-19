import { NextResponse } from "next/server"
import { getAdminUser, clearAdminSession } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const user = await getAdminUser()
  if (user) {
    await prisma.auditLog.create({
      data: {
        adminUserId: user.id,
        action: "LOGOUT",
        entityType: "session",
      },
    })
  }
  await clearAdminSession()
  return NextResponse.json({ success: true })
}
