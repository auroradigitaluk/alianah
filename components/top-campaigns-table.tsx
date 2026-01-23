"use client"

import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface TopCampaign {
  id: string
  name: string
  amountPence: number
  type?: string
}

export function TopCampaignsTable({ campaigns }: { campaigns: TopCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No campaigns found
      </div>
    )
  }

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "Appeal":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "Water Project":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
      case "Product":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="flex items-center justify-between py-2 border-b last:border-b-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium text-sm truncate">{campaign.name}</div>
              {campaign.type && (
                <Badge variant="outline" className={`text-xs ${getTypeColor(campaign.type)}`}>
                  {campaign.type}
                </Badge>
              )}
            </div>
          </div>
          <div className="font-semibold text-sm ml-4 flex-shrink-0">
            {formatCurrency(campaign.amountPence)}
          </div>
        </div>
      ))}
    </div>
  )
}
