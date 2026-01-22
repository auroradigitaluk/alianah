import { AdminHeader } from "@/components/admin-header"
import { WaterProjectCountryForm } from "@/components/water-project-country-form"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getCountry(id: string) {
  try {
    return await prisma.waterProjectCountry.findUnique({
      where: { id },
    })
  } catch (error) {
    return null
  }
}

export default async function EditWaterProjectCountryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const country = await getCountry(id)

  if (!country) {
    notFound()
  }

  return (
    <>
      <AdminHeader title="Edit Country" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Edit Country</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Update country details</p>
                </div>
                <WaterProjectCountryForm country={country} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
