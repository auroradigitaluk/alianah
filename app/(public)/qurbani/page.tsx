import { prisma } from "@/lib/prisma"
import { QurbaniPublicPage } from "@/components/qurbani-public-page"
import { getQurbaniEnabled } from "@/lib/settings"

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
  const [countries, qurbaniEnabled] = await Promise.all([getQurbaniCountries(), getQurbaniEnabled()])
  const visibleCountries = qurbaniEnabled ? countries : []

  return (
    <div className="min-h-screen">
      <QurbaniPublicPage countries={visibleCountries} />
    </div>
  )
}
