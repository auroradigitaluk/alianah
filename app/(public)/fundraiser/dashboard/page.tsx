import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { getFundraiserTotalRaisedAndCount } from "@/lib/fundraiser-totals"
import { FundraiserDashboardClient } from "@/components/fundraiser-dashboard-client"

export const dynamic = "force-dynamic"

type CustomApprovalStatus = "APPROVED" | "PENDING" | "DECLINED"

async function getFundraisers(email: string) {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      where: { email },
      include: {
        appeal: {
          select: {
            title: true,
            slug: true,
            fundraisingImageUrls: true,
            appealImageUrls: true,
          },
        },
        waterProject: {
          select: {
            projectType: true,
            fundraisingImageUrls: true,
            projectImageUrls: true,
          },
        },
        qurbaniCountry: {
          select: {
            country: true,
            fundraisingImageUrls: true,
          },
        },
        donations: {
          where: { status: "COMPLETED" },
          select: { amountPence: true },
        },
        cashDonations: {
          where: { status: "APPROVED" },
          select: { amountPence: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const parseImageArray = (value: string | null | undefined): string[] => {
      if (!value) return []
      try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    const defaultImage =
      "https://sp-ao.shortpixel.ai/client/to_webp,q_glossy,ret_img,w_3000/https://alianah.org/wp-content/uploads/2025/05/4-1.webp"

    return await Promise.all(
      fundraisers.map(async (fundraiser) => {
        const isWaterFundraiser = Boolean(fundraiser.waterProjectId && fundraiser.waterProject)
        const isQurbani = Boolean(fundraiser.qurbaniCountryId && fundraiser.qurbaniCountry)
        const { totalRaisedPence, donationCount } = await getFundraiserTotalRaisedAndCount(
          fundraiser.id,
          isWaterFundraiser
        )
        const totalRaised = totalRaisedPence
        const progressPercentage = fundraiser.targetAmountPence
          ? Math.min((totalRaised / fundraiser.targetAmountPence) * 100, 100)
          : 0
        const campaignTitle = fundraiser.isCustom
          ? "Custom fundraiser"
          : fundraiser.appeal?.title
            ? fundraiser.appeal.title
            : fundraiser.waterProject?.projectType === "WATER_PUMP"
              ? "Water Pumps"
              : fundraiser.waterProject?.projectType === "WATER_WELL"
                ? "Water Wells"
                : fundraiser.waterProject?.projectType === "WATER_TANK"
                  ? "Water Tanks"
                  : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                    ? "Wudhu Areas"
                    : isQurbani
                      ? `Qurbani - ${fundraiser.qurbaniCountry?.country ?? "Country"}`
                      : "Water Project"
        const campaignSlug = fundraiser.isCustom
          ? ""
          : fundraiser.appeal?.slug
            ? fundraiser.appeal.slug
            : fundraiser.waterProject?.projectType === "WATER_PUMP"
              ? "water-pumps"
              : fundraiser.waterProject?.projectType === "WATER_WELL"
                ? "water-wells"
                : fundraiser.waterProject?.projectType === "WATER_TANK"
                  ? "water-tanks"
                  : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                    ? "water-wudhu"
                    : isQurbani
                      ? "qurbani"
                      : ""

        const customImages = parseImageArray(fundraiser.customImageUrls)
        const fundraisingImages = isWaterFundraiser
          ? parseImageArray(fundraiser.waterProject?.fundraisingImageUrls)
          : isQurbani
            ? parseImageArray(fundraiser.qurbaniCountry?.fundraisingImageUrls)
            : parseImageArray(fundraiser.appeal?.fundraisingImageUrls)
        const fallbackImages = isWaterFundraiser
          ? parseImageArray(fundraiser.waterProject?.projectImageUrls)
          : isQurbani
            ? []
            : parseImageArray(fundraiser.appeal?.appealImageUrls)
        const imageUrl =
          customImages[0] || fundraisingImages[0] || fallbackImages[0] || defaultImage

        return {
          ...fundraiser,
          totalRaised,
          progressPercentage,
          donationCount,
          campaign: {
            title: campaignTitle,
            slug: campaignSlug,
            type: (fundraiser.isCustom
              ? "CUSTOM"
              : fundraiser.appeal
                ? "APPEAL"
                : isWaterFundraiser
                  ? "WATER"
                  : isQurbani
                    ? "QURBANI"
                    : "WATER") as "APPEAL" | "WATER" | "QURBANI" | "CUSTOM",
          },
          customApprovalStatus: fundraiser.customApprovalStatus as CustomApprovalStatus,
          imageUrl,
        }
      })
    )
  } catch (error) {
    console.error("Error fetching fundraisers:", error)
    return []
  }
}

async function getEligibleAppeals() {
  try {
    return await prisma.appeal.findMany({
      where: { isActive: true, allowFundraising: true },
      select: { id: true, title: true, slug: true, summary: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    })
  } catch (error) {
    console.error("Error fetching eligible appeals:", error)
    return []
  }
}

async function getEligibleWaterProjects() {
  try {
    const projects = await prisma.waterProject.findMany({
      where: { isActive: true, allowFundraising: true },
      select: { id: true, projectType: true, description: true },
      orderBy: { projectType: "asc" },
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
    redirect("/fundraise/login?redirect=/fundraiser/dashboard")
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
