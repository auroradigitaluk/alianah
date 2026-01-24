import { prisma } from "@/lib/prisma"
import { OneNationDonationForm } from "@/components/one-nation-donation-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils"
import { Droplet, ArrowRight, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

async function getActiveAppeals() {
  try {
    return await prisma.appeal.findMany({
      where: { isActive: true, archivedAt: null },
      include: {
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amountPence: true,
          },
        },
        offlineIncome: {
          select: {
            amountPence: true,
          },
        },
        collections: {
          select: {
            amountPence: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("Error fetching appeals:", error)
    return []
  }
}

async function getOrCreateDefaultAppeal() {
  try {
    // Get any appeal (active or not) for the donation form fallback
    let appeal = await prisma.appeal.findFirst({
      where: { archivedAt: null },
      orderBy: { createdAt: "desc" },
    })

    // If no appeals exist, create a default "General Donation" appeal
    if (!appeal) {
      appeal = await prisma.appeal.create({
        data: {
          title: "General Donation",
          slug: "general-donation",
          summary: "Support our humanitarian efforts with a general donation",
          sectionIntro: "Your donation helps us continue our mission",
          sectionNeed: "We need your support to help those in need",
          sectionFundsUsed: "Funds are used to support our various humanitarian projects",
          sectionImpact: "Your contribution makes a meaningful difference",
          isActive: true,
          donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
          allowMonthly: true,
          allowYearly: true,
          allowFundraising: false,
        },
      })
    }

    return appeal
  } catch (error) {
    console.error("Error fetching/creating appeal:", error)
    return null
  }
}

async function getActiveWaterProjects() {
  try {
    return await prisma.waterProject.findMany({
      where: {
        isActive: true,
      },
      include: {
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amountPence: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    })
  } catch (error) {
    console.error("Error fetching water projects:", error)
    return []
  }
}

async function getWaterProjectsForForm() {
  try {
    return await prisma.waterProject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        projectType: true,
        location: true,
        description: true,
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    console.error("Error fetching water projects:", error)
    return []
  }
}

async function getWaterProjectCountriesForForm() {
  try {
    return await prisma.waterProjectCountry.findMany({
      where: { isActive: true },
      select: {
        id: true,
        projectType: true,
        country: true,
        pricePence: true,
      },
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })
  } catch (error) {
    console.error("Error fetching water project countries:", error)
    return []
  }
}

export default async function HomePage() {
  const [appeals, waterProjects, fallbackAppeal, waterProjectsForForm, waterProjectCountries] = await Promise.all([
    getActiveAppeals(),
    getActiveWaterProjects(),
    getOrCreateDefaultAppeal(), // Get any appeal or create default if none exist
    getWaterProjectsForForm(), // Get water projects for the form
    getWaterProjectCountriesForForm(), // Get water project countries with prices
  ])

  // Calculate totals for each appeal
  const appealsWithTotals = appeals.map((appeal) => {
    const donationsTotal = appeal.donations.reduce((sum, d) => sum + d.amountPence, 0)
    const offlineTotal = appeal.offlineIncome.reduce((sum, d) => sum + d.amountPence, 0)
    const collectionsTotal = appeal.collections.reduce((sum, d) => sum + d.amountPence, 0)
    const totalRaised = donationsTotal + offlineTotal + collectionsTotal

    const donationTypesEnabled = appeal.donationTypesEnabled
      ? JSON.parse(appeal.donationTypesEnabled)
      : ["GENERAL"]

    return {
      ...appeal,
      totalRaised,
      donationTypesEnabled,
    }
  })


  // Prepare all appeals with their products for the form
  const allAppealsForForm = appealsWithTotals.length > 0 
    ? appealsWithTotals 
    : fallbackAppeal 
      ? [{
          ...fallbackAppeal,
          totalRaised: 0,
          donationTypesEnabled: fallbackAppeal.donationTypesEnabled
            ? JSON.parse(fallbackAppeal.donationTypesEnabled)
            : ["GENERAL"],
        }]
      : []

  // Get all unique donation types
  const allDonationTypes = allAppealsForForm.length > 0
    ? Array.from(new Set(allAppealsForForm.flatMap((a) => a.donationTypesEnabled))) as ("GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH")[]
    : ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"] as ("GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH")[]

  return (
    <div id="top" className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero Section with One Nation Style Donation Form */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:px-6 md:py-8">
        {/* Minimal Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight md:text-3xl mb-2">
            Make a Difference Today
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Support our humanitarian efforts and help those in need. Every donation makes a meaningful impact.
          </p>
        </div>

        {/* One Nation Style Donation Form */}
        {(allAppealsForForm.length > 0 || waterProjectsForForm.length > 0) ? (
          <OneNationDonationForm
            appeals={allAppealsForForm.map((a) => ({
              id: a.id,
              title: a.title,
              slug: a.slug,
              allowMonthly: a.allowMonthly,
              monthlyPricePence: a.monthlyPricePence,
              oneOffPresetAmountsPence: a.oneOffPresetAmountsPence,
              monthlyPresetAmountsPence: a.monthlyPresetAmountsPence,
            }))}
            products={[]}
            donationTypesEnabled={allDonationTypes}
            waterProjects={waterProjectsForForm}
            waterProjectCountries={waterProjectCountries}
          />
        ) : (
          <div className="mb-4 sm:mb-6 text-center p-6 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">
              No campaigns available at the moment.
            </p>
            <p className="text-xs text-muted-foreground">
              Please create an appeal in the admin panel to start accepting donations.
            </p>
          </div>
        )}
      </div>


      {/* Water Projects Section */}
      {waterProjects.length > 0 && (
        <div className="border-t">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:px-6 md:py-8 max-w-7xl">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
                <Droplet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Water for Life Projects
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Support clean water initiatives around the world.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {waterProjects.map((project) => {
                const totalRaised = project.donations.reduce((sum, d) => sum + d.amountPence, 0)
                const projectTypeLabels: Record<string, string> = {
                  WATER_PUMP: "Water Pump",
                  WATER_WELL: "Water Well",
                  WATER_TANK: "Water Tank",
                  WUDHU_AREA: "Wudhu Area",
                }

                return (
                  <div key={project.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-base sm:text-lg font-semibold line-clamp-2 flex-1">
                          {project.location || projectTypeLabels[project.projectType] || "Water Project"}
                        </h3>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {projectTypeLabels[project.projectType] || project.projectType}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-3">
                          {project.description}
                        </p>
                      )}
                      <div className="space-y-2 mb-4">
                        {totalRaised > 0 && (
                          <p className="text-xs sm:text-sm">
                            <span className="text-muted-foreground">Raised: </span>
                            <span className="font-semibold">{formatCurrency(totalRaised)}</span>
                          </p>
                        )}
                        {project.status && (
                          <p className="text-xs sm:text-sm">
                            <span className="text-muted-foreground">Status: </span>
                            <span className="font-medium">{project.status}</span>
                          </p>
                        )}
                      </div>
                      <Button asChild size="sm" className="w-full text-xs sm:text-sm">
                        <Link href="/water-for-life">
                          View Project
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {waterProjects.length >= 6 && (
              <div className="mt-6 text-center">
                <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm">
                  <Link href="/water-for-life">
                    View All Water Projects
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
