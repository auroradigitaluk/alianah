"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FundraisersDashboardKpis, type FundraiserStats } from "@/components/fundraisers-dashboard-kpis"
import { FundraisersTable } from "@/components/fundraisers-table"
import { FundraiserCashReviewTable } from "@/components/fundraiser-cash-review-table"
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
  byCampaign: FundraisedByCampaignRow[]
  eligibleCampaigns: EligibleCampaign[]
  openId?: string | null
}

export function FundraisersDashboardClient({
  fundraisers,
  stats,
  byCampaign = [],
  eligibleCampaigns = [],
  openId = null,
}: FundraisersDashboardClientProps) {
  const [selectedFundraiserId, setSelectedFundraiserId] = useState<string | null>(openId ?? null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (openId) queueMicrotask(() => setSelectedFundraiserId(openId))
  }, [openId])

  const handleClearSelection = useCallback(() => {
    setSelectedFundraiserId(null)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Fundraisers</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Dashboard for fundraising campaigns. Let supporters create and share their own pages.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Create fundraiser
        </Button>
      </div>
      <CreateFundraiserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        eligibleCampaigns={eligibleCampaigns}
      />
      <FundraisersDashboardKpis stats={stats} />

      <Tabs defaultValue="fundraisers" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="fundraisers">Fundraisers ({fundraisers.length})</TabsTrigger>
          <TabsTrigger value="cash-review">Cash to review</TabsTrigger>
          <TabsTrigger value="appeals">Fundraising appeals ({byCampaign.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="fundraisers" className="mt-0">
          <div>
            <h3 className="mb-4 text-base font-semibold">All fundraisers</h3>
            <FundraisersTable
              fundraisers={fundraisers}
              initialSelectedId={selectedFundraiserId}
              onSelectionClear={handleClearSelection}
            />
          </div>
        </TabsContent>
        <TabsContent value="cash-review" className="mt-0">
          <div>
            <h3 className="mb-4 text-base font-semibold">Pending cash donations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Fundraisers can record cash they received from family and friends. Review and approve or reject each submission.
            </p>
            <FundraiserCashReviewTable />
          </div>
        </TabsContent>
        <TabsContent value="appeals" className="mt-0">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
