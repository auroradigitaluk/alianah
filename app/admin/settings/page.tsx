import { AdminHeader } from "@/components/admin-header"

export default async function SettingsPage() {
  return (
    <>
      <AdminHeader title="Settings" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Settings</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">System configuration</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Settings coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
