import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { WaterProjectCountriesTable } from "@/components/water-project-countries-table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"

async function getCountries() {
  try {
    return await prisma.waterProjectCountry.findMany({
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })
  } catch (error) {
    return []
  }
}

export default async function WaterProjectCountriesPage() {
  const countries = await getCountries()

  return (
    <>
      <AdminHeader title="Water Project Countries" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Countries</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Manage countries for each project type</p>
                  </div>
                  <Link href="/admin/water-projects/countries/new">
                    <Button>
                      <IconPlus className="h-4 w-4 mr-2" />
                      New Country
                    </Button>
                  </Link>
                </div>
                <div>
                  {countries.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No countries yet</p>
                  ) : (
                    <WaterProjectCountriesTable countries={countries} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
