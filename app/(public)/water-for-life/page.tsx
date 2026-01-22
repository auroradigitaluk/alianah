import { prisma } from "@/lib/prisma"
import { WaterForLifePage } from "@/components/water-for-life-page"

async function getCountries() {
  try {
    return await prisma.waterProjectCountry.findMany({
      where: { isActive: true },
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })
  } catch (error) {
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
        country: true,
        donations: {
          select: {
            amountPence: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch (error) {
    return []
  }
}

export default async function WaterForLifePublicPage() {
  const [countries, projects] = await Promise.all([getCountries(), getProjects()])

  return <WaterForLifePage countries={countries} projects={projects} />
}
