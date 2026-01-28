import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { WaterForLifePage } from "@/components/water-for-life-page"

export const dynamic = "force-dynamic"

const TYPE_MAP: Record<string, "WATER_PUMP" | "WATER_WELL" | "WATER_TANK" | "WUDHU_AREA"> = {
  pumps: "WATER_PUMP",
  wells: "WATER_WELL",
  tanks: "WATER_TANK",
  wudhu: "WUDHU_AREA",
}

const TYPE_CONTENT: Record<
  "WATER_PUMP" | "WATER_WELL" | "WATER_TANK" | "WUDHU_AREA",
  { title: string; description: string }
> = {
  WATER_PUMP: {
    title: "Water Pumps",
    description: "Provide clean water access through water pumps. Select a country to donate.",
  },
  WATER_WELL: {
    title: "Water Wells",
    description: "Build water wells for communities in need. Select a country to donate.",
  },
  WATER_TANK: {
    title: "Water Tanks",
    description: "Install water storage tanks for reliable supply. Select a country to donate.",
  },
  WUDHU_AREA: {
    title: "Wudhu Areas",
    description: "Construct wudhu facilities for mosques and communities. Select a country to donate.",
  },
}

async function getCountries() {
  try {
    return await prisma.waterProjectCountry.findMany({
      where: { isActive: true },
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })
  } catch {
    return []
  }
}

async function getProjects() {
  try {
    return await prisma.waterProject.findMany({
      where: {
        isActive: true,
      },
      include: {
        donations: {
          select: {
            amountPence: true,
            country: {
              select: {
                country: true,
                pricePence: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch {
    return []
  }
}

export default async function WaterTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  const projectType = TYPE_MAP[type]
  if (!projectType) notFound()

  const [countries, projects] = await Promise.all([getCountries(), getProjects()])
  const content = TYPE_CONTENT[projectType]

  return (
    <WaterForLifePage
      countries={countries}
      projects={projects}
      initialProjectType={projectType}
      lockProjectType
      headerTitle={content.title}
      headerDescription={content.description}
    />
  )
}
