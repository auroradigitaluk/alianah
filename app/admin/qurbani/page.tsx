import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { QurbaniPageClient } from "@/components/qurbani-page-client"

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
  const countries = await getQurbaniCountries()

  return (
    <>
      <AdminHeader title="Qurbani" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Qurbani</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Set up qurbani donation options by country (1/7th, Small, Large) and view donations
                  </p>
                </div>
                <QurbaniPageClient initialCountries={countries} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
