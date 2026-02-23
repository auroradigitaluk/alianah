import { prisma } from "@/lib/prisma"
import {
  getDeduplicatedDonationSum,
  getDeduplicatedDonationCount,
} from "@/lib/donation-dedup"

const WATER_PROJECT_STATUSES = ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] as const

/**
 * Total raised and donation count for a fundraiser (same logic as admin).
 * - Appeal fundraisers: Donation table (deduplicated) + cash.
 * - Water fundraisers: Donation table (contributions) + cash. When target is met, one consolidated
 *   WaterProjectDonation is created for the pump (excluded from this total).
 */
export async function getFundraiserTotalRaisedAndCount(
  fundraiserId: string,
  isWaterFundraiser: boolean
): Promise<{ totalRaisedPence: number; donationCount: number }> {
  const [donationSum, donationCount, legacyWaterSum, cashAgg] = await Promise.all([
    getDeduplicatedDonationSum({
      fundraiserId,
      status: "COMPLETED",
    }),
    getDeduplicatedDonationCount({
      fundraiserId,
      status: "COMPLETED",
    }),
    // Legacy: water fundraisers used to have per-contribution WaterProjectDonations; exclude consolidated donation
    isWaterFundraiser
      ? (async () => {
          const f = await prisma.fundraiser.findUnique({
            where: { id: fundraiserId },
            select: { consolidatedWaterProjectDonationId: true },
          })
          if (!f?.consolidatedWaterProjectDonationId) {
            const agg = await prisma.waterProjectDonation.aggregate({
              where: {
                fundraiserId,
                status: { in: [...WATER_PROJECT_STATUSES] },
              },
              _sum: { amountPence: true },
              _count: { id: true },
            })
            return { sum: agg._sum.amountPence ?? 0, count: agg._count.id }
          }
          const agg = await prisma.waterProjectDonation.aggregate({
            where: {
              fundraiserId,
              id: { not: f.consolidatedWaterProjectDonationId },
              status: { in: [...WATER_PROJECT_STATUSES] },
            },
            _sum: { amountPence: true },
            _count: { id: true },
          })
          return { sum: agg._sum.amountPence ?? 0, count: agg._count.id }
        })()
      : Promise.resolve({ sum: 0, count: 0 }),
    prisma.fundraiserCashDonation.aggregate({
      where: { fundraiserId, status: "APPROVED" },
      _sum: { amountPence: true },
      _count: { id: true },
    }),
  ])

  const totalRaisedPence =
    donationSum + legacyWaterSum.sum + (cashAgg._sum.amountPence ?? 0)

  const donationCountTotal =
    donationCount + legacyWaterSum.count + cashAgg._count.id

  return { totalRaisedPence, donationCount: donationCountTotal }
}
