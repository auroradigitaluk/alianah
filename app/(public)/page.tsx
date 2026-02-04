import { prisma } from "@/lib/prisma"
import { OneNationDonationForm } from "@/components/one-nation-donation-form"

export const dynamic = 'force-dynamic'

async function getActiveAppeals() {
  try {
    return await prisma.appeal.findMany({
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
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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

async function getWaterProjectsForForm() {
  try {
    return await prisma.waterProject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        projectType: true,
        location: true,
        description: true,
        plaqueAvailable: true,
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

async function getSponsorshipProjectsForForm() {
  try {
    return await prisma.sponsorshipProject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        projectType: true,
        location: true,
        description: true,
      },
      orderBy: { projectType: "asc" },
    })
  } catch (error) {
    console.error("Error fetching sponsorship projects:", error)
    return []
  }
}

async function getSponsorshipProjectCountriesForForm() {
  try {
    return await prisma.sponsorshipProjectCountry.findMany({
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
    console.error("Error fetching sponsorship project countries:", error)
    return []
  }
}

export default async function HomePage() {
  const [
    appeals,
    fallbackAppeal,
    waterProjectsForForm,
    waterProjectCountries,
    sponsorshipProjectsForForm,
    sponsorshipProjectCountries,
  ] = await Promise.all([
    getActiveAppeals(),
    getOrCreateDefaultAppeal(), // Get any appeal or create default if none exist
    getWaterProjectsForForm(), // Get water projects for the form
    getWaterProjectCountriesForForm(), // Get water project countries with prices
    getSponsorshipProjectsForForm(),
    getSponsorshipProjectCountriesForForm(),
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
          <h1 className="text-2xl sm:text-2xl font-bold tracking-tight md:text-3xl mb-2">
            Give with Purpose
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
            sponsorshipProjects={sponsorshipProjectsForForm}
            sponsorshipProjectCountries={sponsorshipProjectCountries}
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
    </div>
  )
}
