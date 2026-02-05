import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export async function GET() {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const users = await prisma.adminUser.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      orderBy: { email: "asc" },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error("Staff list GET error:", error)
    return NextResponse.json({ error: "Failed to load staff list" }, { status: 500 })
  }
}
