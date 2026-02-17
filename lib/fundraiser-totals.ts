import { prisma } from "@/lib/prisma"
import {
  getDeduplicatedDonationSum,
  getDeduplicatedDonationCount,
} from "@/lib/donation-dedup"

const WATER_PROJECT_STATUSES = ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"] as const

/**
 * Total raised and donation count for a fundraiser (same logic as admin).
 * Includes: deduplicated online donations, water project donations (if water), and approved cash donations.
 */
export async function getFundraiserTotalRaisedAndCount(
  fundraiserId: string,
  isWaterFundraiser: boolean
): Promise<{ totalRaisedPence: number; donationCount: number }> {
  const [donationSum, donationCount, waterAgg, cashAgg] = await Promise.all([
    isWaterFundraiser
      ? Promise.resolve(0)
      : getDeduplicatedDonationSum({
          fundraiserId,
          status: "COMPLETED",
        }),
    isWaterFundraiser
      ? Promise.resolve(0)
      : getDeduplicatedDonationCount({
          fundraiserId,
          status: "COMPLETED",
        }),
    isWaterFundraiser
      ? prisma.waterProjectDonation.aggregate({
          where: {
            fundraiserId,
            status: { in: [...WATER_PROJECT_STATUSES] },
          },
          _sum: { amountPence: true },
          _count: { id: true },
        })
      : Promise.resolve({ _sum: { amountPence: null }, _count: { id: 0 } }),
    prisma.fundraiserCashDonation.aggregate({
      where: { fundraiserId, status: "APPROVED" },
      _sum: { amountPence: true },
      _count: { id: true },
    }),
  ])

  const totalRaisedPence =
    donationSum +
    (waterAgg._sum.amountPence ?? 0) +
    (cashAgg._sum.amountPence ?? 0)

  const donationCountTotal =
    donationCount + waterAgg._count.id + cashAgg._count.id

  return { totalRaisedPence, donationCount: donationCountTotal }
}
