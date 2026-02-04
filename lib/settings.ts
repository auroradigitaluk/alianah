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
