import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { FundraiserDashboardClient } from "@/components/fundraiser-dashboard-client"

export const dynamic = 'force-dynamic'

async function getFundraisers(email: string) {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      where: {
        email,
      },
      include: {
        appeal: {
          select: {
            title: true,
            slug: true,
          },
        },
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amountPence: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return fundraisers.map((fundraiser) => {
      const totalRaised = fundraiser.donations.reduce(
        (sum, d) => sum + d.amountPence,
        0
      )
      const progressPercentage = fundraiser.targetAmountPence
        ? Math.min((totalRaised / fundraiser.targetAmountPence) * 100, 100)
        : 0

      return {
        ...fundraiser,
        totalRaised,
        progressPercentage,
        donationCount: fundraiser.donations.length,
      }
    })
  } catch (error) {
    console.error("Error fetching fundraisers:", error)
    return []
  }
}

async function getEligibleAppeals() {
  try {
    const appeals = await prisma.appeal.findMany({
      where: {
        isActive: true,
        allowFundraising: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
      },
      orderBy: {
        title: "asc",
      },
    })

    return appeals
  } catch (error) {
    console.error("Error fetching eligible appeals:", error)
    return []
  }
}

export default async function FundraiserDashboardPage() {
  const email = await getFundraiserEmail()

  if (!email) {
    redirect("/fundraise/login?redirect=/fundraise/dashboard")
  }

  const [fundraisers, eligibleAppeals] = await Promise.all([
    getFundraisers(email),
    getEligibleAppeals(),
  ])

  return (
    <FundraiserDashboardClient
      fundraisers={fundraisers}
      eligibleAppeals={eligibleAppeals}
    />
  )
}
