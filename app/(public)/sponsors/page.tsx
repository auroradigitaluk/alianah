import { prisma } from "@/lib/prisma"
import { SponsorshipPage } from "@/components/sponsorship-page"

export const dynamic = "force-dynamic"

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

export default async function SponsorsPublicPage() {
  const [projects, countries] = await Promise.all([
    getSponsorshipProjectsForForm(),
    getSponsorshipProjectCountriesForForm(),
  ])

  return <SponsorshipPage projects={projects} countries={countries} />
}
