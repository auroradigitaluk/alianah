import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

const SETTINGS_ID = "organization"

export async function GET() {
  const [, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err

  try {
    const row = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
      select: { qurbaniEnabled: true },
    })
    return NextResponse.json({ qurbaniEnabled: row?.qurbaniEnabled ?? true })
  } catch (error) {
    console.error("Qurbani settings GET error:", error)
    return NextResponse.json({ error: "Failed to load qurbani settings" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const [, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err

  try {
    const body = await request.json()
    const qurbaniEnabled = Boolean(body?.qurbaniEnabled)

    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: { qurbaniEnabled },
      create: {
        id: SETTINGS_ID,
        charityName: "Alianah Humanity Welfare",
        supportEmail: "support@alianah.org",
        websiteUrl: "https://www.alianah.org",
        qurbaniEnabled,
      },
    })

    return NextResponse.json({ qurbaniEnabled })
  } catch (error) {
    console.error("Qurbani settings PATCH error:", error)
    return NextResponse.json({ error: "Failed to update qurbani settings" }, { status: 500 })
  }
}
