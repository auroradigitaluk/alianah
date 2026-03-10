import { redirect } from "next/navigation"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { FundraiserSettingsClient } from "@/components/fundraiser-settings-client"

export const dynamic = "force-dynamic"

export default async function FundraiserSettingsPage() {
  const email = await getFundraiserEmail()
  if (!email) {
    redirect("/fundraise/login?redirect=/fundraiser/settings")
  }

  return (
    <div className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-lg">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Profile settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your name and email
        </p>
      </div>
      <FundraiserSettingsClient />
    </div>
  )
}
