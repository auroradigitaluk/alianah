import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getFundraiserTotalRaisedAndCount } from "@/lib/fundraiser-totals"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { FundraiserForm } from "@/components/fundraiser-form"
import { FundraiserDonationCard } from "@/components/fundraiser-donation-card"
import { FundraiserInlineDonation } from "@/components/fundraiser-inline-donation"
import { FundraiserPublicCashForm } from "@/components/fundraiser-public-cash-form"
import { FundraiserRecentDonations } from "@/components/fundraiser-recent-donations"
import { FundraisingSlideshow } from "@/components/fundraising-slideshow"
import { Button } from "@/components/ui/button"
import { LayoutDashboard } from "lucide-react"

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
        plaqueAvailable: true,
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
            fundraisingDefaultMessage: true,
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
            fundraisingDefaultMessage: true,
          },
        },
        waterProjectCountry: {
          select: {
            id: true,
            country: true,
            pricePence: true,
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
    const [sessionEmail, { totalRaisedPence, donationCount }] = await Promise.all([
      getFundraiserEmail(),
      getFundraiserTotalRaisedAndCount(fundraiser.id, Boolean(fundraiser.waterProjectId && fundraiser.waterProject)),
    ])
    const isWaterFundraiser = Boolean(fundraiser.waterProjectId && fundraiser.waterProject)
    const completedDonations = fundraiser.donations
    const isOwner =
      sessionEmail != null &&
      fundraiser.email != null &&
      sessionEmail === fundraiser.email.trim().toLowerCase()
    const totalRaised = totalRaisedPence

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
      <div className="min-h-screen bg-[#fafafa] dark:bg-background">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          {isOwner && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">You&apos;re the owner of this campaign.</span>
              <Button asChild variant="default" size="sm" className="gap-1.5">
                <Link href="/fundraise/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Manage campaigns
                </Link>
              </Button>
            </div>
          )}
          {/* Centered header - LaunchGood style */}
          <header className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-foreground tracking-tight max-w-3xl mx-auto">
              {fundraiser.title}
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-muted-foreground">
              Organised by {fundraiser.fundraiserName}
            </p>
          </header>

          {/* One split card: image left, stats right */}
          <div id="fundraiser-hero-card" className="rounded-xl border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-[1.2fr_420px] items-stretch">
            <div className="relative min-h-[280px] lg:min-h-[560px]">
              <FundraisingSlideshow
                images={slideshowImages}
                alt={campaignTitle}
                className="rounded-none h-full min-h-[280px] lg:min-h-[560px] aspect-[4/3] lg:aspect-auto"
              />
            </div>
            <div className="scroll-mt-4 flex flex-col justify-center lg:sticky lg:top-6 lg:self-start lg:min-h-[560px]">
              <FundraiserDonationCard
                embedStatsInCard
                statsOnly
                campaignTitle={campaignTitle}
                totalRaised={totalRaised}
                targetAmountPence={fundraiser.targetAmountPence}
                progressPercentage={progressPercentage}
                donationCount={donationCount}
                {...(isWaterFundraiser
                  ? {
                      waterProject: {
                        id: fundraiser.waterProject!.id,
                        projectType: fundraiser.waterProject!.projectType,
                        plaqueAvailable: fundraiser.waterProject!.plaqueAvailable,
                      },
                      waterProjectPresetCountry: fundraiser.waterProjectCountry
                        ? {
                            id: fundraiser.waterProjectCountry.id,
                            country: fundraiser.waterProjectCountry.country,
                            pricePence: fundraiser.waterProjectCountry.pricePence,
                          }
                        : undefined,
                      waterProjectPresetAmountPence:
                        !fundraiser.waterProjectCountry && fundraiser.targetAmountPence != null
                          ? fundraiser.targetAmountPence
                          : undefined,
                      waterProjectPlaqueName: fundraiser.plaqueName ?? undefined,
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
              />
            </div>
          </div>

          {/* Story + recent supporters side by side on desktop (card same width as split card right column) */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-10 items-start">
            <div id="fundraiser-about" className="min-w-0 scroll-mt-24">
              {(fundraiser.message || (isWaterFundraiser ? fundraiser.waterProject?.fundraisingDefaultMessage : fundraiser.appeal?.fundraisingDefaultMessage)) && (
                <div className="prose prose-sm sm:prose-base max-w-none text-neutral-700 dark:text-muted-foreground prose-p:text-neutral-700 dark:prose-p:text-muted-foreground">
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                    {fundraiser.message || (isWaterFundraiser ? fundraiser.waterProject?.fundraisingDefaultMessage : fundraiser.appeal?.fundraisingDefaultMessage)}
                  </p>
                </div>
              )}
            </div>
            <div id="fundraiser-donors" className="w-full lg:w-[420px] lg:max-w-[420px] min-w-0 scroll-mt-24">
              <FundraiserRecentDonations
                fundraiserId={fundraiser.id}
                donations={completedDonations.map((d) => ({
                  amountPence: d.amountPence,
                  donor: d.donor,
                  isAnonymous: d.isAnonymous,
                  timeAgo: formatTimeAgo(d.createdAt),
                }))}
              />
            </div>
          </div>

          {/* Inline donation (appeal: one card, pay on page) or water fundraiser (form + basket) */}
          <div id="donate-section" className="mt-8 sm:mt-10 scroll-mt-24 space-y-5">
            {isWaterFundraiser ? (
              <FundraiserDonationCard
                formOnly
                campaignTitle={campaignTitle}
                organizerName={fundraiser.fundraiserName}
                totalRaised={totalRaised}
                targetAmountPence={fundraiser.targetAmountPence}
                progressPercentage={progressPercentage}
                donationCount={donationCount}
                waterProject={{
                  id: fundraiser.waterProject!.id,
                  projectType: fundraiser.waterProject!.projectType,
                  plaqueAvailable: fundraiser.waterProject!.plaqueAvailable,
                }}
                waterProjectPresetCountry={fundraiser.waterProjectCountry
                  ? {
                      id: fundraiser.waterProjectCountry.id,
                      country: fundraiser.waterProjectCountry.country,
                      pricePence: fundraiser.waterProjectCountry.pricePence,
                    }
                  : undefined}
                waterProjectPresetAmountPence={
                  !fundraiser.waterProjectCountry && fundraiser.targetAmountPence != null
                    ? fundraiser.targetAmountPence
                    : undefined
                }
                waterProjectPlaqueName={fundraiser.plaqueName ?? undefined}
                fundraiserId={fundraiser.id}
              />
            ) : (
              <>
                <FundraiserInlineDonation
                  fundraiserId={fundraiser.id}
                  appealId={fundraiser.appeal!.id}
                  appealTitle={fundraiser.appeal!.title}
                  campaignTitle={campaignTitle}
                  organizerName={fundraiser.fundraiserName}
                  donationTypesEnabled={donationTypesEnabled}
                />
                <FundraiserPublicCashForm fundraiserId={fundraiser.id} />
              </>
            )}
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
          <p className="text-sm text-muted-foreground text-center">
            Creating new fundraising pages for water projects is currently unavailable. You can still
            support our water projects by donating through our main campaigns.
          </p>
        </div>
      </div>
    )
  }

  // Not found
  notFound()
}
