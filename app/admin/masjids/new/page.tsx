import { AdminHeader } from "@/components/admin-header"
import { MasjidForm } from "@/components/masjid-form"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NewMasjidPage() {
  return (
    <>
      <AdminHeader title="New Masjid" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Create Masjid</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Add a new masjid contact record
                  </p>
                </div>
                <div>
                  <MasjidForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
