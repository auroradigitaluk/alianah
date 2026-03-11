"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate, formatEnum, formatPaymentMethod } from "@/lib/utils"
import type { ReportsResponse, ReportRow } from "@/lib/reports"
import { ReportExportButton } from "@/components/reports/report-export-button"
import { ReportTable } from "@/components/reports/report-table"
import { ReportsDateFilter } from "@/components/reports/reports-date-filter"
import { StaffFilterSelect } from "@/components/staff-filter-select"
import { Skeleton } from "@/components/ui/skeleton"

type RangeState = { startDate: Date | null; endDate: Date | null }

function getLast30DaysRange(): RangeState {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - 30)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return { startDate: start, endDate: end }
}

const defaultRange: RangeState = getLast30DaysRange()
const formatAmount = (value?: number | null) => (value ? formatCurrency(value) : "£0.00")

const toCsvRows = (rows: ReportRow[]) =>
  rows.map((row) => ({
    label: row.label,
    count: row.count ?? 0,
    amountPence: row.amountPence ?? 0,
    amountFormatted: formatAmount(row.amountPence),
  }))

export function ReportsPageClient() {
  const [range, setRange] = useState<RangeState>(defaultRange)
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const staffParam = searchParams.get("staff")

  const fetchReports = useCallback(
    async (nextRange: RangeState) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (nextRange.startDate && nextRange.endDate) {
          params.set("start", nextRange.startDate.toISOString())
          params.set("end", nextRange.endDate.toISOString())
        }
        if (staffParam) params.set("staff", staffParam)
        const res = await fetch(`/api/admin/reports?${params.toString()}`)
        if (!res.ok) throw new Error("Failed to load reports")
        const payload = (await res.json()) as ReportsResponse
        setData(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports")
      } finally {
        setLoading(false)
      }
    },
    [staffParam]
  )

  useEffect(() => {
    fetchReports(range)
  }, [fetchReports, range])

  const handleRangeChange = useCallback((nextRange: RangeState) => {
    setRange(nextRange)
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Reports</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Charity-wide overview for the selected period.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <StaffFilterSelect paramName="staff" label="Filter by staff" />
            <ReportsDateFilter onRangeChange={handleRangeChange} />
          </div>
        </div>
        <section className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-1">
                  <Skeleton className="h-3 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </section>
        <section className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-64 w-full" />
        </section>
        <section className="space-y-4">
          <Skeleton className="h-4 w-28" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Reports</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Charity-wide overview for the selected period.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <StaffFilterSelect paramName="staff" label="Filter by staff" />
            <ReportsDateFilter onRangeChange={handleRangeChange} />
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { financial, donations, donors, collections, fundraising, projects, recurring, appeals } = data
  const sourceRows = financial.sources
  const paymentRows = donations.byPaymentMethod
  const appealRows = appeals.byAppeal
  const collectionTypeRows = collections.byType
  const collectionLocationRows = collections.byMasjid ?? []
  const fundraiserRows = fundraising.byFundraiser
  const recurringStatusRows = recurring.byStatus

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Reports</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Charity-wide overview · {data.range?.start && data.range?.end
              ? `${formatDate(data.range.start)} – ${formatDate(data.range.end)}`
              : "All time"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <StaffFilterSelect paramName="staff" label="Filter by staff" />
          <ReportsDateFilter onRangeChange={handleRangeChange} />
        </div>
      </div>

      {/* 1. Overview – headline numbers + income by source */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total income</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(financial.totalIncomePence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Transactions</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{financial.totalCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Gift Aid</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(financial.giftAidPence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Recurring (active)</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(sourceRows.find((r) => r.label === "Recurring (active)")?.amountPence ?? 0)}
            </CardContent>
          </Card>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Income by source</p>
          <ReportTable
            columns={[
              { key: "label", header: "Source", render: (row) => row.label },
              { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
              {
                key: "amountPence",
                header: "Amount",
                align: "right",
                render: (row) => formatAmount(row.amountPence),
              },
            ]}
            data={sourceRows}
          />
        </div>
      </section>

      {/* 2. Campaigns & appeals */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Campaigns & appeals
          </h3>
          <ReportExportButton
            label="Export appeals"
            filename="appeals-performance.csv"
            columns={[
              { key: "label", label: "Appeal", getValue: (row) => row.label },
              { key: "donationAmountPence", label: "Online", getValue: (row) => formatAmount(row.donationAmountPence) },
              { key: "offlineAmountPence", label: "Offline", getValue: (row) => formatAmount(row.offlineAmountPence) },
              { key: "collectionAmountPence", label: "Collections", getValue: (row) => formatAmount(row.collectionAmountPence) },
              { key: "fundraiserAmountPence", label: "Fundraisers", getValue: (row) => formatAmount(row.fundraiserAmountPence ?? 0) },
              { key: "totalPence", label: "Total", getValue: (row) => formatAmount(row.totalPence) },
            ]}
            data={appealRows}
          />
        </div>
        <ReportTable
          columns={[
            { key: "label", header: "Appeal" },
            {
              key: "donationAmountPence",
              header: "Online",
              align: "right",
              render: (row) => formatAmount(row.donationAmountPence),
            },
            {
              key: "offlineAmountPence",
              header: "Offline",
              align: "right",
              render: (row) => formatAmount(row.offlineAmountPence),
            },
            {
              key: "collectionAmountPence",
              header: "Collections",
              align: "right",
              render: (row) => formatAmount(row.collectionAmountPence),
            },
            {
              key: "fundraiserAmountPence",
              header: "Fundraisers",
              align: "right",
              render: (row) => formatAmount(row.fundraiserAmountPence ?? 0),
            },
            {
              key: "totalPence",
              header: "Total",
              align: "right",
              render: (row) => formatAmount(row.totalPence),
            },
          ]}
          data={appealRows.map((row) => ({ ...row, label: row.label || "Unassigned" }))}
        />
      </section>

      {/* 3. Donors */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Donors
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total donors</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{donors.summary.totalDonors}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">New (this period)</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{donors.summary.newDonors}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Returning</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{donors.summary.returningDonors}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Gift Aid rate</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{donors.summary.giftAidRate}%</CardContent>
          </Card>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Top donors (by amount)</p>
          <ReportTable
            columns={[
              { key: "name", header: "Donor" },
              { key: "email", header: "Email" },
              { key: "donationCount", header: "Donations", align: "right" },
              {
                key: "amountPence",
                header: "Amount",
                align: "right",
                render: (row) => formatAmount(row.amountPence),
              },
            ]}
            data={donors.topDonors.map((row) => ({ ...row, label: row.donorId }))}
          />
        </div>
      </section>

      {/* 4. All donations by type & payment */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          All donations (by type & payment)
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">By donation type (all sources)</p>
              <ReportTable
                columns={[
                  { key: "label", header: "Type", render: (row) => formatEnum(row.label) },
                  { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                  { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
                ]}
                data={donations.byType}
              />
            </div>
            {(donations.lillahByAppeal?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Lillah by appeal</p>
                <ReportTable
                  columns={[
                    { key: "label", header: "Appeal", render: (row) => row.label },
                    { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
                  ]}
                  data={donations.lillahByAppeal ?? []}
                />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">By payment method (all sources)</p>
            <ReportTable
              columns={[
                { key: "label", header: "Method", render: (row) => formatPaymentMethod(row.label) },
                { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
              ]}
              data={paymentRows}
            />
          </div>
        </div>
      </section>

      {/* 5. Collections */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Collections
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total collected</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(collections.totalCollectedPence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Collections</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{collections.collectionCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg per collection</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {collections.collectionCount
                ? formatAmount(Math.round(collections.totalCollectedPence / collections.collectionCount))
                : "£0.00"}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top 5 by collection type</p>
            <ReportTable
              columns={[
                { key: "label", header: "Type", render: (row) => formatEnum(row.label) },
                { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
              ]}
              data={collectionTypeRows.slice(0, 5)}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top 5 by location</p>
            <ReportTable
              columns={[
                { key: "label", header: "Location" },
                { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
              ]}
              data={collectionLocationRows.slice(0, 5)}
            />
          </div>
        </div>
      </section>

      {/* 6. Fundraising */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fundraising
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total raised</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(fundraising.totalRaisedPence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{fundraising.activeFundraisers}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total fundraisers</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{fundraising.fundraiserCount}</CardContent>
          </Card>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">By fundraiser</p>
          <ReportTable
            columns={[
              { key: "label", header: "Fundraiser" },
              { key: "name", header: "Name", render: (row) => row.name ?? "—" },
              { key: "count", header: "Donations", align: "right", render: (row) => row.count ?? 0 },
              { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
            ]}
            data={fundraiserRows}
          />
        </div>
      </section>

      {/* 7. Projects (water, sponsorship, qurbani) */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Projects
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Water</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(projects.water.totalPence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Sponsorship</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(projects.sponsorship.totalPence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Qurbani</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(projects.qurbani.totalPence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Reports sent</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {projects.water.completedReports + projects.sponsorship.completedReports}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 8. Recurring */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recurring giving
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active total</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {formatAmount(recurring.activeTotalPence)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active count</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{recurring.activeCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">By status</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {recurringStatusRows.length} segments
            </CardContent>
          </Card>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Recurring by status</p>
          <ReportTable
            columns={[
              { key: "label", header: "Status", render: (row) => formatEnum(row.label) },
              { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
              { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
            ]}
            data={recurringStatusRows}
          />
        </div>
      </section>

      {/* 9. Operations (refunds / failed) – compact */}
      {(data.operations.refunds.length > 0 || data.operations.failed.length > 0) && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Operations
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Refunds</p>
              <ReportTable
                columns={[
                  { key: "label", header: "Status" },
                  { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                  { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
                ]}
                data={data.operations.refunds}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Failed</p>
              <ReportTable
                columns={[
                  { key: "label", header: "Status" },
                  { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                  { key: "amountPence", header: "Amount", align: "right", render: (row) => formatAmount(row.amountPence) },
                ]}
                data={data.operations.failed}
              />
            </div>
          </div>
        </section>
      )}

      {/* 10. Staff (if any) */}
      {data.staff.byStaff.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Staff (logged income)
            </h3>
            <ReportExportButton
              label="Export staff"
              filename="staff-report.csv"
              columns={[
                { key: "label", label: "Staff", getValue: (row) => row.label },
                { key: "offlineIncomePence", label: "Offline", getValue: (row) => formatAmount(row.offlineIncomePence) },
                { key: "collectionsPence", label: "Collections", getValue: (row) => formatAmount(row.collectionsPence) },
                { key: "waterDonationsPence", label: "Water", getValue: (row) => formatAmount(row.waterDonationsPence) },
                { key: "sponsorshipDonationsPence", label: "Sponsorship", getValue: (row) => formatAmount(row.sponsorshipDonationsPence) },
                { key: "totalPence", label: "Total", getValue: (row) => formatAmount(row.totalPence) },
              ]}
              data={data.staff.byStaff}
            />
          </div>
          <ReportTable
            columns={[
              { key: "label", header: "Staff" },
              { key: "offlineIncomePence", header: "Offline", align: "right", render: (row) => formatAmount(row.offlineIncomePence) },
              { key: "collectionsPence", header: "Collections", align: "right", render: (row) => formatAmount(row.collectionsPence) },
              { key: "waterDonationsPence", header: "Water", align: "right", render: (row) => formatAmount(row.waterDonationsPence) },
              { key: "sponsorshipDonationsPence", header: "Sponsorship", align: "right", render: (row) => formatAmount(row.sponsorshipDonationsPence) },
              { key: "totalPence", header: "Total", align: "right", render: (row) => formatAmount(row.totalPence) },
            ]}
            data={data.staff.byStaff.map((row) => ({ ...row, label: row.label }))}
          />
        </section>
      )}

      {/* Exports */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Export
        </h3>
        <div className="flex flex-wrap gap-2">
          <ReportExportButton
            label="Payment summary (CSV)"
            filename="financial-by-payment-method.csv"
            columns={[
              { key: "label", label: "Payment method", getValue: (row) => row.label },
              { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
              { key: "amountPence", label: "Amount (pence)", getValue: (row) => row.amountPence ?? 0 },
              { key: "amountFormatted", label: "Amount", getValue: (row) => row.amountFormatted ?? "" },
            ]}
            data={toCsvRows(paymentRows)}
          />
          <ReportExportButton
            label="Income by source (CSV)"
            filename="income-by-source.csv"
            columns={[
              { key: "label", label: "Source", getValue: (row) => row.label },
              { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
              { key: "amountPence", label: "Amount (pence)", getValue: (row) => row.amountPence ?? 0 },
              { key: "amountFormatted", label: "Amount", getValue: (row) => formatAmount(row.amountPence) },
            ]}
            data={toCsvRows(sourceRows)}
          />
        </div>
      </section>
    </div>
  )
}
