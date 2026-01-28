import { prisma } from "@/lib/prisma"
import { WaterForLifePage } from "@/components/water-for-life-page"

export const dynamic = "force-dynamic"

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

export default async function WaterPage() {
  const [countries, projects] = await Promise.all([getCountries(), getProjects()])

  return <WaterForLifePage countries={countries} projects={projects} />
}
