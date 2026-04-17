import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { QurbaniPageClient } from "@/components/qurbani-page-client"
import { getQurbaniEnabled } from "@/lib/settings"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getQurbaniCountries() {
  try {
    return await prisma.qurbaniCountry.findMany({
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
      include: { _count: { select: { donations: true } } },
    })
  } catch {
    return []
  }
}

export default async function QurbaniAdminPage() {
  const [countries, qurbaniEnabled] = await Promise.all([getQurbaniCountries(), getQurbaniEnabled()])

  return (
    <>
      <AdminHeader title="Qurbani" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <QurbaniPageClient initialCountries={countries} initialQurbaniEnabled={qurbaniEnabled} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
