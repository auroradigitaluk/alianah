import { randomInt } from "crypto"
import { prisma } from "@/lib/prisma"

/** Format: 786-1######## (8 digits after the 1), same as online donations. */
export async function generateDonationNumber(): Promise<string> {
  for (let attempt = 0; attempt < 15; attempt++) {
    const n = randomInt(0, 100_000_000)
    const candidate = `786-1${String(n).padStart(8, "0")}`

    const [demoOrder, offlineIncome, waterDonation, sponsorshipDonation] =
      await Promise.all([
        prisma.demoOrder.findUnique({
          where: { orderNumber: candidate },
          select: { id: true },
        }),
        prisma.offlineIncome.findFirst({
          where: { donationNumber: candidate },
          select: { id: true },
        }),
        prisma.waterProjectDonation.findFirst({
          where: { donationNumber: candidate },
          select: { id: true },
        }),
        prisma.sponsorshipDonation.findFirst({
          where: { donationNumber: candidate },
          select: { id: true },
        }),
      ])

    if (!demoOrder && !offlineIncome && !waterDonation && !sponsorshipDonation) {
      return candidate
    }
  }
  throw new Error("Failed to generate donation number")
}
