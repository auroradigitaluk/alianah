"use client"

import { formatCurrency } from "@/lib/utils"

interface TopCampaign {
  id: string
  name: string
  amountPence: number
}

export function TopCampaignsTable({ campaigns }: { campaigns: TopCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No campaigns found
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="flex items-center justify-between py-2 border-b last:border-b-0"
        >
          <div className="font-medium text-sm">{campaign.name}</div>
          <div className="font-semibold text-sm">
            {formatCurrency(campaign.amountPence)}
          </div>
        </div>
      ))}
    </div>
  )
}
