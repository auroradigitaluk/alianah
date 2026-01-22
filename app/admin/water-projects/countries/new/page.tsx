import { AdminHeader } from "@/components/admin-header"
import { WaterProjectCountryForm } from "@/components/water-project-country-form"

export default async function NewWaterProjectCountryPage() {
  return (
    <>
      <AdminHeader title="New Country" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6 max-w-2xl">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Add Country</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Add a new country for water projects</p>
                </div>
                <WaterProjectCountryForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
