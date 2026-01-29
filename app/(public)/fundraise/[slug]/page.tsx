import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FundraiserForm } from "@/components/fundraiser-form"
import { FundraiserDonationCard } from "@/components/fundraiser-donation-card"
import { FundraisingSlideshow } from "@/components/fundraising-slideshow"

export const dynamic = 'force-dynamic'

const WATER_TYPE_SLUG_MAP: Record<string, "WATER_PUMP" | "WATER_WELL" | "WATER_TANK" | "WUDHU_AREA"> = {
  "water-pumps": "WATER_PUMP",
  "water-wells": "WATER_WELL",
  "water-tanks": "WATER_TANK",
  "water-wudhu": "WUDHU_AREA",
}

const WATER_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pumps",
  WATER_WELL: "Water Wells",
  WATER_TANK: "Water Tanks",
  WUDHU_AREA: "Wudhu Areas",
}

async function getAppeal(slug: string) {
  try {
    const appeal = await prisma.appeal.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        summary: true,
        isActive: true,
        archivedAt: true,
        allowFundraising: true,
        fundraisingDefaultMessage: true,
      },
    })

    if (!appeal || !appeal.isActive || appeal.archivedAt || !appeal.allowFundraising) {
      return null
    }

    return appeal
  } catch (error) {
    console.error("Error fetching appeal:", error)
    return null
  }
}

async function getWaterProject(projectType: "WATER_PUMP" | "WATER_WELL" | "WATER_TANK" | "WUDHU_AREA") {
  try {
    const project = await prisma.waterProject.findUnique({
      where: { projectType },
      select: {
        id: true,
        projectType: true,
        description: true,
        isActive: true,
        allowFundraising: true,
        fundraisingDefaultMessage: true,
      },
    })

    if (!project || !project.isActive || !project.allowFundraising) {
      return null
    }

    return project
  } catch (error) {
    console.error("Error fetching water project:", error)
    return null
  }
}

async function getFundraiser(slug: string) {
  try {
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { slug },
      include: {
        appeal: {
          select: {
            id: true,
            title: true,
            summary: true,
            slug: true,
            isActive: true,
            archivedAt: true,
            allowMonthly: true,
            allowYearly: true,
            monthlyPricePence: true,
            yearlyPricePence: true,
            oneOffPresetAmountsPence: true,
            monthlyPresetAmountsPence: true,
            yearlyPresetAmountsPence: true,
            donationTypesEnabled: true,
            appealImageUrls: true,
            fundraisingImageUrls: true,
            products: {
              include: {
                product: true,
              },
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
        waterProject: {
          select: {
            id: true,
            projectType: true,
            plaqueAvailable: true,
            isActive: true,
            allowFundraising: true,
            projectImageUrls: true,
            fundraisingImageUrls: true,
          },
        },
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amountPence: true,
            isAnonymous: true,
            donor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
        waterProjectDonations: {
          where: {
            status: {
              in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"],
            },
          },
          select: {
            amountPence: true,
            isAnonymous: true,
            donor: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            createdAt: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    })

    if (!fundraiser) {
      console.log(`Fundraiser not found: ${slug}`)
      return null
    }

    if (!fundraiser.isActive) {
      console.log(`Fundraiser is inactive: ${slug}`)
      return null
    }

    if (fundraiser.appeal) {
      if (!fundraiser.appeal.isActive) {
        console.log(`Appeal is inactive for fundraiser: ${slug}`)
        return null
      }

      if (fundraiser.appeal.archivedAt) {
        console.log(`Appeal is archived for fundraiser: ${slug}`)
        return null
      }
    }

    return fundraiser
  } catch (error) {
    console.error("Error fetching fundraiser:", error)
    return null
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return `${Math.floor(diffInSeconds / 604800)}w ago`
}

const parseImageArray = (value?: string | null): string[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function FundraisePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // First check if it's a fundraiser
  const fundraiser = await getFundraiser(slug)

  if (fundraiser) {
    // Render fundraiser page
    const isWaterFundraiser = Boolean(fundraiser.waterProjectId && fundraiser.waterProject)
    const completedDonations = isWaterFundraiser
      ? fundraiser.waterProjectDonations
      : fundraiser.donations
    const totalRaised = completedDonations.reduce((sum, d) => sum + d.amountPence, 0)

    const progressPercentage = fundraiser.targetAmountPence
      ? Math.min((totalRaised / fundraiser.targetAmountPence) * 100, 100)
      : 0

    const donationTypesEnabled = fundraiser.appeal?.donationTypesEnabled
      ? JSON.parse(fundraiser.appeal.donationTypesEnabled)
      : ["GENERAL"]

    // Parse fundraising images - use fundraising images if available, otherwise fallback to appeal images, then hardcoded
    const fundraisingImages: string[] = isWaterFundraiser
      ? parseImageArray(fundraiser.waterProject?.fundraisingImageUrls)
      : parseImageArray(fundraiser.appeal?.fundraisingImageUrls)

    const appealImages: string[] = isWaterFundraiser
      ? parseImageArray(fundraiser.waterProject?.projectImageUrls)
      : parseImageArray(fundraiser.appeal?.appealImageUrls)

    // Use first fundraising image, or first appeal image, or fallback to hardcoded
    const slideshowImages =
      fundraisingImages.length > 0
        ? fundraisingImages
        : appealImages.length > 0
          ? appealImages
          : ["https://sp-ao.shortpixel.ai/client/to_webp,q_glossy,ret_img,w_3000/https://alianah.org/wp-content/uploads/2025/05/4-1.webp"]

    const campaignTitle = isWaterFundraiser
      ? WATER_TYPE_LABELS[fundraiser.waterProject?.projectType || ""] || "Water Project"
      : fundraiser.appeal?.title || "Alianah Humanity Welfare"

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Primary Content (~65%) */}
            <div className="space-y-4 sm:space-y-6 order-1 lg:order-1">
              {/* 1. Fundraiser Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight">
                {fundraiser.title}
              </h1>

              {/* 2. Fundraising Slideshow */}
              <FundraisingSlideshow images={slideshowImages} alt={campaignTitle} />

              {/* 3. Fundraiser Meta Row */}
              <div className="space-y-1">
                <p className="text-sm sm:text-base font-medium">
                  {fundraiser.fundraiserName}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  is fundraising for <span className="font-medium text-foreground">{campaignTitle}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Donation protected
                </p>
              </div>

              {/* 4. Fundraiser Story */}
              {fundraiser.message && (
                <div className="prose prose-sm sm:prose-base max-w-none">
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-foreground">
                    {fundraiser.message}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Donation Card (~35%) - Sticky on Desktop */}
            <div className="order-2 lg:order-2">
              <div className="lg:sticky lg:top-6">
                <FundraiserDonationCard
                  totalRaised={totalRaised}
                  targetAmountPence={fundraiser.targetAmountPence}
                  progressPercentage={progressPercentage}
                  donationCount={completedDonations.length}
                  {...(isWaterFundraiser
                    ? {
                        waterProject: {
                          id: fundraiser.waterProject!.id,
                          projectType: fundraiser.waterProject!.projectType,
                          plaqueAvailable: fundraiser.waterProject!.plaqueAvailable,
                        },
                      }
                    : {
                        appeal: {
                          id: fundraiser.appeal!.id,
                          title: fundraiser.appeal!.title,
                          allowMonthly: false,
                          monthlyPricePence: null,
                          oneOffPresetAmountsPence: fundraiser.appeal!.oneOffPresetAmountsPence,
                          monthlyPresetAmountsPence: fundraiser.appeal!.monthlyPresetAmountsPence,
                          yearlyPresetAmountsPence: fundraiser.appeal!.yearlyPresetAmountsPence,
                        },
                        products: fundraiser.appeal!.products.filter((p) => p.frequency === "ONE_OFF"),
                        donationTypesEnabled,
                      })}
                  fundraiserId={fundraiser.id}
                  recentDonations={completedDonations.map((d) => ({
                    ...d,
                    timeAgo: formatTimeAgo(d.createdAt),
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If not a fundraiser, check if it's an appeal
  const appeal = await getAppeal(slug)

  if (appeal) {
    // Render fundraiser creation page
    return (
      <div className="min-h-screen bg-background">
        {/* Main Content */}
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{appeal.title}</h1>
            {appeal.summary && (
              <p className="text-muted-foreground text-base sm:text-lg">{appeal.summary}</p>
            )}
          </div>

          <div className="mb-4 sm:mb-6">
            <FundraiserForm
              appealId={appeal.id}
              campaignTitle={appeal.title}
              defaultMessage={appeal.fundraisingDefaultMessage}
            />
          </div>
        </div>
      </div>
    )
  }

  const waterProjectType = WATER_TYPE_SLUG_MAP[slug]
  if (waterProjectType) {
    const project = await getWaterProject(waterProjectType)
    if (!project) {
      notFound()
    }

    const title = WATER_TYPE_LABELS[project.projectType] || "Water Project"
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{title}</h1>
            {project.description && (
              <p className="text-muted-foreground text-base sm:text-lg">{project.description}</p>
            )}
          </div>
          <div className="mb-4 sm:mb-6">
            <FundraiserForm
              waterProjectId={project.id}
              waterProjectType={project.projectType}
              campaignTitle={title}
              defaultMessage={project.fundraisingDefaultMessage}
            />
          </div>
        </div>
      </div>
    )
  }

  // Not found
  notFound()
}
