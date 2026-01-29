import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SponsorshipPage } from "@/components/sponsorship-page"

export const dynamic = "force-dynamic"

const TYPE_MAP: Record<string, "ORPHANS" | "HIFZ" | "FAMILIES"> = {
  orphans: "ORPHANS",
  hifz: "HIFZ",
  families: "FAMILIES",
}

const TYPE_CONTENT: Record<
  "ORPHANS" | "HIFZ" | "FAMILIES",
  { title: string; description: string }
> = {
  ORPHANS: {
    title: "Orphan Sponsorship",
    description: "Support orphans with monthly or yearly sponsorship. Select a country to donate.",
  },
  HIFZ: {
    title: "Hifz Sponsorship",
    description: "Support students memorising the Quran with monthly or yearly sponsorship.",
  },
  FAMILIES: {
    title: "Family Sponsorship",
    description: "Support families in need with monthly or yearly sponsorship. Select a country to donate.",
  },
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
        projectImageUrls: true,
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
        yearlyPricePence: true,
      },
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })
  } catch (error) {
    console.error("Error fetching sponsorship project countries:", error)
    return []
  }
}

export default async function SponsorsTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  const projectType = TYPE_MAP[type]
  if (!projectType) notFound()

  const [projects, countries] = await Promise.all([
    getSponsorshipProjectsForForm(),
    getSponsorshipProjectCountriesForForm(),
  ])
  const content = TYPE_CONTENT[projectType]

  return (
    <SponsorshipPage
      projects={projects}
      countries={countries}
      initialProjectType={projectType}
      lockProjectType
      headerTitle={content.title}
      headerDescription={content.description}
    />
  )
}
