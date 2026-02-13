import { prisma } from "@/lib/prisma"
import { QurbaniPublicPage } from "@/components/qurbani-public-page"

export const dynamic = "force-dynamic"

async function getQurbaniCountries() {
  try {
    return await prisma.qurbaniCountry.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
    })
  } catch {
    return []
  }
}

export default async function QurbaniPage() {
  const countries = await getQurbaniCountries()

  return (
    <div className="min-h-screen bg-background">
      <QurbaniPublicPage countries={countries} />
    </div>
  )
}
