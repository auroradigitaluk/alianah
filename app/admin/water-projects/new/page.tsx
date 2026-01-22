import { AdminHeader } from "@/components/admin-header"
import { WaterProjectForm } from "@/components/water-project-form"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCountries() {
  try {
    return await prisma.waterProjectCountry.findMany({
      orderBy: [{ projectType: "asc" }, { sortOrder: "asc" }, { country: "asc" }],
    })
  } catch (error) {
    return []
  }
}

export default async function NewWaterProjectPage() {
  const countries = await getCountries()

  return (
    <>
      <AdminHeader title="New Water Project" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Create Water Project</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Add a new water project</p>
                </div>
                <WaterProjectForm countries={countries} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
