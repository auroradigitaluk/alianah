"use client"

import { AdminTable } from "@/components/admin-table"
import { formatCurrency } from "@/lib/utils"

interface TopCampaign {
  id: string
  name: string
  amountPence: number
}

export function TopCampaignsTable({ campaigns }: { campaigns: TopCampaign[] }) {
  return (
    <AdminTable
      data={campaigns}
      columns={[
        {
          id: "name",
          header: "Name",
          cell: (campaign) => (
            <div className="font-medium">{campaign.name}</div>
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: (campaign) => (
            <div className="font-medium">
              {formatCurrency(campaign.amountPence)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
    />
  )
}
