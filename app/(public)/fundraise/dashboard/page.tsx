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
        waterProject: {
          select: {
            projectType: true,
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
        waterProjectDonations: {
          where: {
            status: {
              in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"],
            },
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
      const totalRaised = fundraiser.donations
        .concat(fundraiser.waterProjectDonations)
        .reduce((sum, d) => sum + d.amountPence, 0)
      const progressPercentage = fundraiser.targetAmountPence
        ? Math.min((totalRaised / fundraiser.targetAmountPence) * 100, 100)
        : 0
      const campaignTitle = fundraiser.appeal?.title
        ? fundraiser.appeal.title
        : fundraiser.waterProject?.projectType === "WATER_PUMP"
          ? "Water Pumps"
          : fundraiser.waterProject?.projectType === "WATER_WELL"
            ? "Water Wells"
            : fundraiser.waterProject?.projectType === "WATER_TANK"
              ? "Water Tanks"
              : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                ? "Wudhu Areas"
                : "Water Project"
      const campaignSlug = fundraiser.appeal?.slug
        ? fundraiser.appeal.slug
        : fundraiser.waterProject?.projectType === "WATER_PUMP"
          ? "water-pumps"
          : fundraiser.waterProject?.projectType === "WATER_WELL"
            ? "water-wells"
            : fundraiser.waterProject?.projectType === "WATER_TANK"
              ? "water-tanks"
              : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                ? "water-wudhu"
                : ""

      return {
        ...fundraiser,
        totalRaised,
        progressPercentage,
        donationCount: fundraiser.donations.length + fundraiser.waterProjectDonations.length,
        campaign: {
          title: campaignTitle,
          slug: campaignSlug,
          type: (fundraiser.appeal ? "APPEAL" : "WATER") as "APPEAL" | "WATER",
        },
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
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    })

    return appeals
  } catch (error) {
    console.error("Error fetching eligible appeals:", error)
    return []
  }
}

async function getEligibleWaterProjects() {
  try {
    const projects = await prisma.waterProject.findMany({
      where: {
        isActive: true,
        allowFundraising: true,
      },
      select: {
        id: true,
        projectType: true,
        description: true,
      },
      orderBy: {
        projectType: "asc",
      },
    })

    return projects.map((project) => ({
      id: project.id,
      title:
        project.projectType === "WATER_PUMP"
          ? "Water Pumps"
          : project.projectType === "WATER_WELL"
            ? "Water Wells"
            : project.projectType === "WATER_TANK"
              ? "Water Tanks"
              : project.projectType === "WUDHU_AREA"
                ? "Wudhu Areas"
                : "Water Project",
      slug:
        project.projectType === "WATER_PUMP"
          ? "water-pumps"
          : project.projectType === "WATER_WELL"
            ? "water-wells"
            : project.projectType === "WATER_TANK"
              ? "water-tanks"
              : project.projectType === "WUDHU_AREA"
                ? "water-wudhu"
                : "water-project",
      summary: project.description || null,
      type: "WATER" as const,
    }))
  } catch (error) {
    console.error("Error fetching eligible water projects:", error)
    return []
  }
}

export default async function FundraiserDashboardPage() {
  const email = await getFundraiserEmail()

  if (!email) {
    redirect("/fundraise/login?redirect=/fundraise/dashboard")
  }

  const [fundraisers, eligibleAppeals, eligibleWaterProjects] = await Promise.all([
    getFundraisers(email),
    getEligibleAppeals(),
    getEligibleWaterProjects(),
  ])

  return (
    <FundraiserDashboardClient
      fundraisers={fundraisers}
      eligibleCampaigns={[
        ...eligibleAppeals.map((appeal) => ({ ...appeal, type: "APPEAL" as const })),
        ...eligibleWaterProjects,
      ]}
    />
  )
}
