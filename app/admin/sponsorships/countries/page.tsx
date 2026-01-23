import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { SponsorshipCountriesTable } from "@/components/sponsorship-countries-table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getCountries() {
  try {
    return await prisma.sponsorshipProjectCountry.findMany({
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })
  } catch (error) {
    return []
  }
}

export default async function SponsorshipCountriesPage() {
  const countries = await getCountries()

  return (
    <>
      <AdminHeader title="Sponsorship Countries" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Countries</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Manage countries for Orphans, Hifz, and Families
                    </p>
                  </div>
                  <Link href="/admin/sponsorships/countries/new">
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
                    <SponsorshipCountriesTable countries={countries} />
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
