import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  MASJID_DONATION_TYPES,
  MASJID_APPEAL_SLUG_PREFIX,
  backingPresetAmountsPence,
} from "@/lib/masjid-shared"

/**
 * Masjid Donations ride on the existing Appeal pipeline. Each MasjidProject is
 * backed by a hidden Appeal; donations and fundraisers flow through the standard
 * appeal checkout/finalize/fundraiser code with no payment changes. This module
 * keeps the backing appeal in sync with masjid content. Client-safe helpers and
 * constants live in `lib/masjid-shared.ts`.
 */

export {
  MASJID_CONTRIBUTION_PRESETS_PENCE,
  MASJID_DONATION_TYPES,
  MASJID_APPEAL_SLUG_PREFIX,
  slugify,
} from "@/lib/masjid-shared"

interface MasjidContent {
  title: string
  slug: string
  summary: string
  imageUrls: string
  fundraisingImageUrls: string
  fundraisingDefaultMessage: string | null
  allowFundraising: boolean
  priceFromPence: number
  framerUrl: string | null
  isActive: boolean
}

/** Fields written to the backing appeal on create AND kept in sync on update. */
export function backingAppealData(
  content: MasjidContent
): Prisma.AppealUncheckedCreateInput {
  return {
    title: content.title,
    slug: `${MASJID_APPEAL_SLUG_PREFIX}${content.slug}`,
    summary: content.summary,
    sectionIntro: "",
    sectionNeed: "",
    sectionFundsUsed: "",
    sectionImpact: "",
    framerUrl: content.framerUrl || null,
    isActive: content.isActive,
    donationTypesEnabled: JSON.stringify(MASJID_DONATION_TYPES),
    allowMonthly: false,
    allowYearly: false,
    allowCustomMonthly: false,
    allowCustomYearly: false,
    allowFundraising: content.allowFundraising,
    allowDailyGiving: false,
    // Hidden from every general surface — masjids are shown only under /masjids.
    showOnDonationForm: false,
    showOnZakatPage: false,
    appealImageUrls: content.imageUrls || "[]",
    fundraisingImageUrls: content.fundraisingImageUrls || "[]",
    fundraisingDefaultMessage: content.fundraisingDefaultMessage || null,
    oneOffPresetAmountsPence: backingPresetAmountsPence(content.priceFromPence),
    monthlyPresetAmountsPence: "[]",
    yearlyPresetAmountsPence: "[]",
    monthlyPricePence: null,
    yearlyPricePence: null,
  }
}

/** Subset of backing-appeal fields that should track masjid edits (not slug/sort). */
export function backingAppealUpdateData(
  content: MasjidContent
): Prisma.AppealUpdateInput {
  const data = backingAppealData(content)
  return {
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    framerUrl: data.framerUrl,
    isActive: data.isActive,
    allowFundraising: data.allowFundraising,
    appealImageUrls: data.appealImageUrls,
    fundraisingImageUrls: data.fundraisingImageUrls,
    fundraisingDefaultMessage: data.fundraisingDefaultMessage,
    oneOffPresetAmountsPence: data.oneOffPresetAmountsPence,
  }
}

/** True if another appeal (e.g. an archived backing appeal) already holds this masjid's appeal slug. */
export async function isBackingAppealSlugTaken(slug: string, exceptAppealId?: string): Promise<boolean> {
  const appeal = await prisma.appeal.findUnique({
    where: { slug: `${MASJID_APPEAL_SLUG_PREFIX}${slug}` },
    select: { id: true },
  })
  return Boolean(appeal && appeal.id !== exceptAppealId)
}

export interface MasjidStats {
  raisedPence: number
  donationCount: number
  fundraiserCount: number
}

/**
 * Total raised for a masjid country = completed donations on its backing appeal
 * (direct donations and appeal-fundraiser donations both carry appealId) plus
 * approved fundraiser cash. Mirrors how the appeal totals are computed elsewhere.
 */
export async function getMasjidStats(appealId: string): Promise<MasjidStats> {
  const [onlineAgg, cashAgg, fundraiserCount] = await Promise.all([
    prisma.donation.aggregate({
      where: { appealId, status: "COMPLETED" },
      _sum: { amountPence: true },
      _count: { id: true },
    }),
    prisma.fundraiserCashDonation.aggregate({
      where: { status: "APPROVED", fundraiser: { appealId } },
      _sum: { amountPence: true },
      _count: { id: true },
    }),
    prisma.fundraiser.count({ where: { appealId, isActive: true } }),
  ])

  return {
    raisedPence: (onlineAgg._sum.amountPence ?? 0) + (cashAgg._sum.amountPence ?? 0),
    donationCount: onlineAgg._count.id + cashAgg._count.id,
    fundraiserCount,
  }
}
