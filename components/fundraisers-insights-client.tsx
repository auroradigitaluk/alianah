"use client"

import { FundraisersDashboardKpis, type FundraiserStats } from "@/components/fundraisers-dashboard-kpis"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { FundraisedByCampaignRow } from "@/app/admin/fundraisers/get-fundraisers"

interface FundraisersInsightsClientProps {
  stats: FundraiserStats
  byCampaign: FundraisedByCampaignRow[]
}

export function FundraisersInsightsClient({
  stats,
  byCampaign,
}: FundraisersInsightsClientProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base sm:text-lg font-semibold">Insights</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Overview of fundraiser performance and totals by campaign.
        </p>
      </div>

      <FundraisersDashboardKpis stats={stats} />

      <div>
        <h3 className="mb-4 text-base font-semibold">Raised by campaign / appeal</h3>
        <div className="w-full overflow-x-auto rounded-lg border shadow-sm bg-card">
          {byCampaign.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign / Appeal</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="text-right tabular-nums">Total raised</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCampaign.map((row) => (
                  <TableRow key={`${row.campaignType}-${row.campaignId}`}>
                    <TableCell className="font-medium">{row.campaignTitle}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.campaignType}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(row.amountPence)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No fundraiser donations per campaign yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
