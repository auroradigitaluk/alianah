"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { CreateFundraiserDialog } from "@/components/create-fundraiser-dialog"
import type { EligibleCampaign } from "@/app/admin/fundraisers/get-fundraisers"
import { ArrowLeft } from "lucide-react"

interface CreateFundraiserPageClientProps {
  eligibleCampaigns: EligibleCampaign[]
}

export function CreateFundraiserPageClient({
  eligibleCampaigns,
}: CreateFundraiserPageClientProps) {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <Link
        href="/admin/fundraisers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to fundraisers
      </Link>
      <div className="max-w-lg">
        <CreateFundraiserDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) router.push("/admin/fundraisers")
          }}
          eligibleCampaigns={eligibleCampaigns}
          onSuccess={({ id }) => {
            router.push(`/admin/fundraisers/${id}`)
          }}
        />
      </div>
    </div>
  )
}
