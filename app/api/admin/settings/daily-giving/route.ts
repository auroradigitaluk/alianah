import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

const SETTINGS_ID = "organization"

export async function GET() {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const row = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
      select: { ramadhanStartDate: true, eidDate: true, dailyGivingAppealIds: true },
    })
    let dailyGivingAppealIds: string[] = []
    if (row?.dailyGivingAppealIds) {
      try {
        const parsed = JSON.parse(row.dailyGivingAppealIds) as unknown
        dailyGivingAppealIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 4) : []
      } catch {
        dailyGivingAppealIds = []
      }
    }
    return NextResponse.json({
      ramadhanStartDate: row?.ramadhanStartDate?.toISOString().slice(0, 10) ?? null,
      ramadhanEndDate: row?.eidDate?.toISOString().slice(0, 10) ?? null,
      dailyGivingAppealIds,
    })
  } catch (error) {
    console.error("Daily giving settings GET error:", error)
    return NextResponse.json(
      { error: "Failed to load daily giving settings" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const body = await request.json()
    const ramadhanStartDate =
      body.ramadhanStartDate == null || body.ramadhanStartDate === ""
        ? null
        : new Date(body.ramadhanStartDate as string)
    const ramadhanEndDate =
      body.ramadhanEndDate == null || body.ramadhanEndDate === ""
        ? null
        : new Date(body.ramadhanEndDate as string)

    if (ramadhanStartDate !== null && isNaN(ramadhanStartDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid Ramadhan start date" },
        { status: 400 }
      )
    }
    if (ramadhanEndDate !== null && isNaN(ramadhanEndDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid End of Ramadhan date" },
        { status: 400 }
      )
    }
    const rawAppealIds = body.dailyGivingAppealIds
    const dailyGivingAppealIds = Array.isArray(rawAppealIds)
      ? rawAppealIds.filter((id): id is string => typeof id === "string").slice(0, 4)
      : []

    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: { ramadhanStartDate, eidDate: ramadhanEndDate, dailyGivingAppealIds: JSON.stringify(dailyGivingAppealIds) },
      create: {
        id: SETTINGS_ID,
        charityName: "Alianah Humanity Welfare",
        supportEmail: "support@alianah.org",
        websiteUrl: "https://www.alianah.org",
        ramadhanStartDate,
        eidDate: ramadhanEndDate,
        dailyGivingAppealIds: JSON.stringify(dailyGivingAppealIds),
      },
    })

    const row = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
      select: { ramadhanStartDate: true, eidDate: true, dailyGivingAppealIds: true },
    })
    let outAppealIds: string[] = []
    if (row?.dailyGivingAppealIds) {
      try {
        const parsed = JSON.parse(row.dailyGivingAppealIds) as unknown
        outAppealIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 4) : []
      } catch {
        outAppealIds = []
      }
    }
    return NextResponse.json({
      ramadhanStartDate: row?.ramadhanStartDate?.toISOString().slice(0, 10) ?? null,
      ramadhanEndDate: row?.eidDate?.toISOString().slice(0, 10) ?? null,
      dailyGivingAppealIds: outAppealIds,
    })
  } catch (error) {
    console.error("Daily giving settings PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update daily giving settings" },
      { status: 500 }
    )
  }
}
