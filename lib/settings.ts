import { prisma } from "@/lib/prisma"

const SETTINGS_ID = "organization"

export type OrganizationSettings = {
  charityName: string
  supportEmail: string
  websiteUrl: string
  charityNumber: string | null
}

const DEFAULTS: OrganizationSettings = {
  charityName: "Alianah Humanity Welfare",
  supportEmail: "support@alianah.org",
  websiteUrl: "https://www.alianah.org",
  charityNumber: null,
}

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  try {
    const row = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    })
    if (!row) return DEFAULTS
    return {
      charityName: row.charityName,
      supportEmail: row.supportEmail,
      websiteUrl: row.websiteUrl,
      charityNumber: row.charityNumber,
    }
  } catch {
    return DEFAULTS
  }
}

export type DailyGivingSettings = {
  ramadhanStartDate: Date | null
  /** End of Ramadhan: final charge on this day, then subscription stops. */
  ramadhanEndDate: Date | null
  dailyGivingAppealIds: string[]
}

export async function getDailyGivingSettings(): Promise<DailyGivingSettings> {
  try {
    const row = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
      select: { ramadhanStartDate: true, eidDate: true, dailyGivingAppealIds: true },
    })
    let appealIds: string[] = []
    if (row?.dailyGivingAppealIds) {
      try {
        const parsed = JSON.parse(row.dailyGivingAppealIds) as unknown
        appealIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
      } catch {
        appealIds = []
      }
    }
    return {
      ramadhanStartDate: row?.ramadhanStartDate ?? null,
      ramadhanEndDate: row?.eidDate ?? null,
      dailyGivingAppealIds: appealIds.slice(0, 4),
    }
  } catch {
    return { ramadhanStartDate: null, ramadhanEndDate: null, dailyGivingAppealIds: [] }
  }
}
