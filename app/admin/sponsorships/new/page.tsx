import { AdminHeader } from "@/components/admin-header"
import { SponsorshipForm } from "@/components/sponsorship-form"
import { prisma } from "@/lib/prisma"

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

export default async function NewSponsorshipProjectPage() {
  const countries = await getCountries()

  return (
    <>
      <AdminHeader title="New Sponsorship Project" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Create Sponsorship Project</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Add a new sponsorship project (Orphans, Hifz, or Families)
                  </p>
                </div>
                <SponsorshipForm countries={countries} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
