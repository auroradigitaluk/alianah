"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FundraisersDashboardKpis, type FundraiserStats } from "@/components/fundraisers-dashboard-kpis"
import { FundraisersTable } from "@/components/fundraisers-table"
import { CreateFundraiserDialog } from "@/components/create-fundraiser-dialog"
import { formatCurrency } from "@/lib/utils"
import { Plus } from "lucide-react"
import type { EligibleCampaign } from "@/app/admin/fundraisers/page"

export interface FundraisedByCampaignRow {
  campaignId: string
  campaignTitle: string
  campaignType: "APPEAL" | "WATER"
  amountPence: number
}

export interface FundraiserRow {
  id: string
  title: string
  slug: string
  fundraiserName: string
  email?: string
  isActive: boolean
  campaign: { title: string; type: "APPEAL" | "WATER" }
  amountRaised: number
}

interface FundraisersDashboardClientProps {
  fundraisers: FundraiserRow[]
  stats: FundraiserStats
  byCampaign?: FundraisedByCampaignRow[]
  eligibleCampaigns?: EligibleCampaign[]
  showCreateButton?: boolean
  showAppealsTab?: boolean
  /** Override page title (e.g. "Complete") */
  pageTitle?: string
  /** Override page description */
  pageDescription?: string
  /** Override list section heading (e.g. "Complete fundraisers") */
  listTitle?: string
}

export function FundraisersDashboardClient({
  fundraisers,
  stats,
  byCampaign = [],
  eligibleCampaigns = [],
  showCreateButton = true,
  showAppealsTab = true,
  pageTitle,
  pageDescription,
  listTitle,
}: FundraisersDashboardClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">
            {pageTitle ?? "Fundraisers"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {pageDescription ??
              "Dashboard for fundraising campaigns. Let supporters create and share their own pages."}
          </p>
        </div>
        {showCreateButton && (
          <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Create fundraiser
          </Button>
        )}
      </div>
      <CreateFundraiserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        eligibleCampaigns={eligibleCampaigns}
      />
      <FundraisersDashboardKpis stats={stats} />

      <div className="space-y-6">
        <div>
          <h3 className="mb-4 text-base font-semibold">
            {listTitle ?? "All fundraisers"}
          </h3>
          <FundraisersTable
            fundraisers={fundraisers}
            linkToDetailPage
          />
        </div>
        {showAppealsTab && (
          <div>
            <h3 className="mb-4 text-base font-semibold">Fundraising appeals ({byCampaign.length})</h3>
            <div className="w-full overflow-x-auto overflow-hidden rounded-lg border shadow-sm bg-card">
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
                  No fundraiser donations per campaign yet. Totals will appear here once donations
                  are made through fundraiser pages (e.g. total raised for Palestine, or water pumps
                  in Sri Lanka).
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
