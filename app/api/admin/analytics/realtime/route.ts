import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

export async function GET() {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const events = await prisma.analyticsEvent.findMany({
      where: {
        eventType: "pageview",
        timestamp: { gte: fiveMinutesAgo },
      },
      select: { deviceId: true },
    })

    const activeVisitors = new Set(
      events
        .filter((e): e is { deviceId: number } => typeof e.deviceId === "number")
        .map((e) => e.deviceId)
    ).size

    return NextResponse.json({ activeVisitors })
  } catch (error) {
    console.error("Realtime analytics failed:", error)
    return NextResponse.json({ activeVisitors: 0 })
  }
}
