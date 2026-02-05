"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatEnum } from "@/lib/utils"
import type { ReportsResponse, ReportRow } from "@/lib/reports"
import { ReportExportButton } from "@/components/reports/report-export-button"
import { ReportTable } from "@/components/reports/report-table"
import { ReportsDateFilter } from "@/components/reports/reports-date-filter"
import { StaffFilterSelect } from "@/components/staff-filter-select"

type RangeState = {
  startDate: Date | null
  endDate: Date | null
}

const defaultRange: RangeState = { startDate: null, endDate: null }

const formatAmount = (value?: number | null) => (value ? formatCurrency(value) : "£0.00")

const toCsvRows = (rows: ReportRow[]) =>
  rows.map((row) => ({
    label: row.label,
    count: row.count ?? 0,
    amountPence: formatAmount(row.amountPence),
  }))

export function ReportsPageClient() {
  const [range, setRange] = useState<RangeState>(defaultRange)
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const staffParam = searchParams.get("staff")

  const fetchReports = useCallback(async (nextRange: RangeState) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (nextRange.startDate && nextRange.endDate) {
        params.set("start", nextRange.startDate.toISOString())
        params.set("end", nextRange.endDate.toISOString())
      }
      if (staffParam) params.set("staff", staffParam)
      const response = await fetch(`/api/admin/reports?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to load reports")
      }
      const payload = (await response.json()) as ReportsResponse
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }, [staffParam])

  useEffect(() => {
    fetchReports(range)
  }, [fetchReports, range, staffParam])

  const handleRangeChange = useCallback((nextRange: RangeState) => {
    setRange(nextRange)
  }, [])

  const financialRows = useMemo(() => (data ? data.financial.sources : []), [data])
  const donationRows = useMemo(() => (data ? data.donations.byType : []), [data])
  const paymentRows = useMemo(() => (data ? data.donations.byPaymentMethod : []), [data])
  const appealRows = useMemo(() => (data ? data.donations.byAppeal : []), [data])
  const fundraiserRows = useMemo(() => (data ? data.donations.byFundraiser : []), [data])
  const donationStatusRows = useMemo(() => (data ? data.donations.byStatus : []), [data])
  const donationChannelRows = useMemo(() => (data ? data.donations.byChannel : []), [data])
  const donationCountryRows = useMemo(() => (data ? data.donations.byCountry : []), [data])
  const donationCityRows = useMemo(() => (data ? data.donations.byCity : []), [data])
  const donationGiftAidRows = useMemo(() => (data ? data.donations.giftAid : []), [data])
  const collectionTypeRows = useMemo(() => (data ? data.collections.byType : []), [data])
  const masjidRows = useMemo(() => (data ? data.collections.byMasjid : []), [data])
  const collectionAppealRows = useMemo(() => (data ? data.collections.byAppeal : []), [data])
  const fundraisingRows = useMemo(() => (data ? data.fundraising.byFundraiser : []), [data])
  const fundraisingTargetRows = useMemo(() => (data ? data.fundraising.byFundraiserTarget : []), [data])
  const waterProjectRows = useMemo(() => (data ? data.projects.water.byProjectType : []), [data])
  const sponsorshipProjectRows = useMemo(() => (data ? data.projects.sponsorship.byProjectType : []), [data])
  const waterStatusRows = useMemo(() => (data ? data.projects.water.byStatus : []), [data])
  const sponsorshipStatusRows = useMemo(() => (data ? data.projects.sponsorship.byStatus : []), [data])
  const donorCountryRows = useMemo(() => (data ? data.donors.byCountry : []), [data])
  const donorCityRows = useMemo(() => (data ? data.donors.byCity : []), [data])
  const recurringStatusRows = useMemo(() => (data ? data.recurring.byStatus : []), [data])
  const recurringFrequencyRows = useMemo(() => (data ? data.recurring.byFrequency : []), [data])
  const recurringNextPaymentRows = useMemo(() => (data ? data.recurring.nextPaymentMonth : []), [data])
  const appealsReportRows = useMemo(() => (data ? data.appeals.byAppeal : []), [data])
  const refundRows = useMemo(() => (data ? data.operations.refunds : []), [data])
  const failedRows = useMemo(() => (data ? data.operations.failed : []), [data])
  const byStaffRows = useMemo(() => (data ? data.staff.byStaff : []), [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Reports</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Comprehensive reporting across all charity activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <StaffFilterSelect paramName="staff" label="Filter by staff" />
          <ReportsDateFilter onRangeChange={handleRangeChange} />
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading reports…</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : data ? (
        <div className="space-y-6">
          <Tabs defaultValue="financial">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
              <TabsTrigger value="donors">Donors</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="fundraising">Fundraising</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="appeals">Appeals</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
            </TabsList>

            <TabsContent value="financial" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Financial Summary
                </h3>
              <ReportExportButton
                filename="financial-by-payment-method.csv"
                  columns={[
                  { key: "label", label: "Payment method", getValue: (row) => row.label },
                    { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                    { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                  ]}
                data={toCsvRows(paymentRows)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total income</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(data.financial.totalIncomePence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total items</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{data.financial.totalCount}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Gift Aid total</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(data.financial.giftAidPence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Recurring (active)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(
                      financialRows.find((row) => row.label === "Recurring (active)")?.amountPence || 0
                    )}
                  </CardContent>
                </Card>
              </div>
              <ReportTable
                columns={[
                  { key: "label", header: "Payment method", render: (row) => formatEnum(row.label) },
                  { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                  {
                    key: "amountPence",
                    header: "Amount",
                    align: "right",
                    render: (row) => formatAmount(row.amountPence),
                  },
                ]}
                data={paymentRows}
              />
            </TabsContent>

            <TabsContent value="donations" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Donations Breakdown
                </h3>
              </div>
              <Tabs defaultValue="types">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="types">Types</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                  <TabsTrigger value="appeals">Appeals</TabsTrigger>
                  <TabsTrigger value="fundraisers">Fundraisers</TabsTrigger>
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="geo">Geography</TabsTrigger>
                  <TabsTrigger value="giftaid">Gift Aid</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By donation type</h4>
                    <ReportExportButton
                      filename="donations-by-type.csv"
                      columns={[
                        { key: "label", label: "Donation type", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(donationRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Donation type", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={donationRows}
                  />
                </TabsContent>

                <TabsContent value="payment" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By payment method</h4>
                    <ReportExportButton
                      filename="donations-by-payment-method.csv"
                      columns={[
                        { key: "label", label: "Payment method", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(paymentRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Payment method", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={paymentRows}
                  />
                </TabsContent>

                <TabsContent value="status" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By status</h4>
                    <ReportExportButton
                      filename="donations-by-status.csv"
                      columns={[
                        { key: "label", label: "Status", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(donationStatusRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Status", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={donationStatusRows}
                  />
                </TabsContent>

                <TabsContent value="appeals" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By appeal</h4>
                    <ReportExportButton
                      filename="donations-by-appeal.csv"
                      columns={[
                        { key: "label", label: "Appeal", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(appealRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Appeal" },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={appealRows}
                  />
                </TabsContent>

                <TabsContent value="fundraisers" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By fundraiser</h4>
                    <ReportExportButton
                      filename="donations-by-fundraiser.csv"
                      columns={[
                        { key: "label", label: "Fundraiser", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(fundraiserRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Fundraiser" },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={fundraiserRows}
                  />
                </TabsContent>

                <TabsContent value="channels" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By channel/source</h4>
                    <ReportExportButton
                      filename="donations-by-channel.csv"
                      columns={[
                        { key: "label", label: "Channel", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(donationChannelRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Channel", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={donationChannelRows}
                  />
                </TabsContent>

                <TabsContent value="geo" className="space-y-4 mt-4">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">By country</h4>
                        <ReportExportButton
                          filename="donations-by-country.csv"
                          columns={[
                            { key: "label", label: "Country", getValue: (row) => row.label },
                            { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                            { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                          ]}
                          data={toCsvRows(donationCountryRows)}
                        />
                      </div>
                      <ReportTable
                        columns={[
                          { key: "label", header: "Country" },
                          { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                          {
                            key: "amountPence",
                            header: "Amount",
                            align: "right",
                            render: (row) => formatAmount(row.amountPence),
                          },
                        ]}
                        data={donationCountryRows}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">By city</h4>
                        <ReportExportButton
                          filename="donations-by-city.csv"
                          columns={[
                            { key: "label", label: "City", getValue: (row) => row.label },
                            { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                            { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                          ]}
                          data={toCsvRows(donationCityRows)}
                        />
                      </div>
                      <ReportTable
                        columns={[
                          { key: "label", header: "City" },
                          { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                          {
                            key: "amountPence",
                            header: "Amount",
                            align: "right",
                            render: (row) => formatAmount(row.amountPence),
                          },
                        ]}
                        data={donationCityRows}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="giftaid" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Gift Aid eligible</h4>
                    <ReportExportButton
                      filename="donations-giftaid.csv"
                      columns={[
                        { key: "label", label: "Donation type", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(donationGiftAidRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Donation type", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={donationGiftAidRows}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="donors" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Donor Analytics
                </h3>
              </div>
              <Tabs defaultValue="summary">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="geo">Geography</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Top donors</h4>
                    <ReportExportButton
                      filename="top-donors.csv"
                      columns={[
                        { key: "name", label: "Donor", getValue: (row) => row.name },
                        { key: "email", label: "Email", getValue: (row) => row.email },
                        { key: "donationCount", label: "Donations", getValue: (row) => row.donationCount },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence },
                      ]}
                      data={data.donors.topDonors}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Total donors</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">
                        {data.donors.summary.totalDonors}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">New donors</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">{data.donors.summary.newDonors}</CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Returning donors</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">
                        {data.donors.summary.returningDonors}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Gift Aid rate</CardTitle>
                      </CardHeader>
                      <CardContent className="text-2xl font-semibold">{data.donors.summary.giftAidRate}%</CardContent>
                    </Card>
                  </div>
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
                    data={data.donors.topDonors.map((row) => ({
                      label: row.donorId,
                      ...row,
                    }))}
                  />
                </TabsContent>

                <TabsContent value="geo" className="space-y-4 mt-4">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">By country</h4>
                        <ReportExportButton
                          filename="donors-by-country.csv"
                          columns={[
                            { key: "label", label: "Country", getValue: (row) => row.label },
                            { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                            { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                          ]}
                          data={toCsvRows(donorCountryRows)}
                        />
                      </div>
                      <ReportTable
                        columns={[
                          { key: "label", header: "Country" },
                          { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                          {
                            key: "amountPence",
                            header: "Amount",
                            align: "right",
                            render: (row) => formatAmount(row.amountPence),
                          },
                        ]}
                        data={donorCountryRows}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">By city</h4>
                        <ReportExportButton
                          filename="donors-by-city.csv"
                          columns={[
                            { key: "label", label: "City", getValue: (row) => row.label },
                            { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                            { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                          ]}
                          data={toCsvRows(donorCityRows)}
                        />
                      </div>
                      <ReportTable
                        columns={[
                          { key: "label", header: "City" },
                          { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                          {
                            key: "amountPence",
                            header: "Amount",
                            align: "right",
                            render: (row) => formatAmount(row.amountPence),
                          },
                        ]}
                        data={donorCityRows}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="collections" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Collections & Masjids
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total collected</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(data.collections.totalCollectedPence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Collections count</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{data.collections.collectionCount}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Avg collection</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {data.collections.collectionCount
                      ? formatAmount(Math.round(data.collections.totalCollectedPence / data.collections.collectionCount))
                      : "£0.00"}
                  </CardContent>
                </Card>
              </div>
              <Tabs defaultValue="type">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="type">Type</TabsTrigger>
                  <TabsTrigger value="masjid">Masjid</TabsTrigger>
                  <TabsTrigger value="appeal">Appeal</TabsTrigger>
                </TabsList>

                <TabsContent value="type" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By collection type</h4>
                    <ReportExportButton
                      filename="collections-by-type.csv"
                      columns={[
                        { key: "label", label: "Type", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(collectionTypeRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Type", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={collectionTypeRows}
                  />
                </TabsContent>

                <TabsContent value="masjid" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By masjid</h4>
                    <ReportExportButton
                      filename="collections-by-masjid.csv"
                      columns={[
                        { key: "label", label: "Masjid", getValue: (row) => row.label },
                        { key: "count", label: "Collections", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(masjidRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Masjid" },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={masjidRows}
                  />
                </TabsContent>

                <TabsContent value="appeal" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By appeal</h4>
                    <ReportExportButton
                      filename="collections-by-appeal.csv"
                      columns={[
                        { key: "label", label: "Appeal", getValue: (row) => row.label },
                        { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(collectionAppealRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Appeal" },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={collectionAppealRows}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="fundraising" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Fundraising Performance
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total raised</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(data.fundraising.totalRaisedPence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Active fundraisers</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{data.fundraising.activeFundraisers}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total fundraisers</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{data.fundraising.fundraiserCount}</CardContent>
                </Card>
              </div>
              <Tabs defaultValue="performance">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                  <TabsTrigger value="targets">Targets</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">By fundraiser</h4>
                    <ReportExportButton
                      filename="fundraising-performance.csv"
                      columns={[
                        { key: "label", label: "Fundraiser", getValue: (row) => row.label },
                        { key: "count", label: "Donations", getValue: (row) => row.count ?? 0 },
                        { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                      ]}
                      data={toCsvRows(fundraisingRows)}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Fundraiser" },
                      { key: "count", header: "Donations", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={fundraisingRows}
                  />
                </TabsContent>

                <TabsContent value="targets" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Target progress</h4>
                    <ReportExportButton
                      filename="fundraising-targets.csv"
                      columns={[
                        { key: "label", label: "Fundraiser", getValue: (row) => row.label },
                        { key: "amountPence", label: "Raised", getValue: (row) => formatAmount(row.amountPence) },
                        {
                          key: "targetPence",
                          label: "Target",
                          getValue: (row) => (row.targetPence ? formatAmount(row.targetPence) : "-"),
                        },
                        { key: "percent", label: "Percent", getValue: (row) => row.percent ?? "" },
                      ]}
                      data={fundraisingTargetRows}
                    />
                  </div>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Fundraiser" },
                      {
                        key: "amountPence",
                        header: "Raised",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                      {
                        key: "targetPence",
                        header: "Target",
                        align: "right",
                        render: (row) => (row.targetPence ? formatAmount(row.targetPence) : "-"),
                      },
                      {
                        key: "percent",
                        header: "Percent",
                        align: "right",
                        render: (row) => (row.percent !== null ? `${row.percent}%` : "-"),
                      },
                    ]}
                    data={fundraisingTargetRows.map((row) => ({ id: row.fundraiserId, ...row }))}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="projects" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Project Reports
                </h3>
                <ReportExportButton
                  filename="project-report-summary.csv"
                  columns={[
                    { key: "label", label: "Project type", getValue: (row) => row.label },
                    { key: "count", label: "Donations", getValue: (row) => row.count ?? 0 },
                    { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                  ]}
                  data={toCsvRows([...waterProjectRows, ...sponsorshipProjectRows])}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Water projects total</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(data.projects.water.totalPence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Sponsorship total</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(data.projects.sponsorship.totalPence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Reports sent</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {data.projects.water.completedReports + data.projects.sponsorship.completedReports}
                  </CardContent>
                </Card>
              </div>
              <Tabs defaultValue="water">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="water">Water</TabsTrigger>
                  <TabsTrigger value="sponsorship">Sponsorship</TabsTrigger>
                  <TabsTrigger value="status">Status</TabsTrigger>
                </TabsList>

                <TabsContent value="water" className="space-y-3 mt-4">
                  <h4 className="text-sm font-semibold">Water projects</h4>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Project type", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Donations", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={waterProjectRows}
                  />
                </TabsContent>

                <TabsContent value="sponsorship" className="space-y-3 mt-4">
                  <h4 className="text-sm font-semibold">Sponsorship projects</h4>
                  <ReportTable
                    columns={[
                      { key: "label", header: "Project type", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Donations", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={sponsorshipProjectRows}
                  />
                </TabsContent>

                <TabsContent value="status" className="space-y-4 mt-4">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Water status</h4>
                      <ReportTable
                        columns={[
                          { key: "label", header: "Status", render: (row) => formatEnum(row.label) },
                          { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                          {
                            key: "amountPence",
                            header: "Amount",
                            align: "right",
                            render: (row) => formatAmount(row.amountPence),
                          },
                        ]}
                        data={waterStatusRows}
                      />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Sponsorship status</h4>
                      <ReportTable
                        columns={[
                          { key: "label", header: "Status", render: (row) => formatEnum(row.label) },
                          { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                          {
                            key: "amountPence",
                            header: "Amount",
                            align: "right",
                            render: (row) => formatAmount(row.amountPence),
                          },
                        ]}
                        data={sponsorshipStatusRows}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="recurring" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Recurring Donations
                </h3>
                <ReportExportButton
                  filename="recurring-summary.csv"
                  columns={[
                    { key: "label", label: "Segment", getValue: (row) => row.label },
                    { key: "count", label: "Count", getValue: (row) => row.count ?? 0 },
                    { key: "amountPence", label: "Amount", getValue: (row) => row.amountPence ?? 0 },
                  ]}
                  data={toCsvRows(recurringStatusRows)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Active total</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {formatAmount(data.recurring.activeTotalPence)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Active count</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{data.recurring.activeCount}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Next payments</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">{recurringNextPaymentRows.length}</CardContent>
                </Card>
              </div>
              <Tabs defaultValue="status">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="status">Status</TabsTrigger>
                  <TabsTrigger value="frequency">Frequency</TabsTrigger>
                  <TabsTrigger value="next">Next payments</TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="space-y-3 mt-4">
                  <ReportTable
                    columns={[
                      { key: "label", header: "Status", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={recurringStatusRows}
                  />
                </TabsContent>

                <TabsContent value="frequency" className="space-y-3 mt-4">
                  <ReportTable
                    columns={[
                      { key: "label", header: "Frequency", render: (row) => formatEnum(row.label) },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={recurringFrequencyRows}
                  />
                </TabsContent>

                <TabsContent value="next" className="space-y-3 mt-4">
                  <ReportTable
                    columns={[
                      { key: "label", header: "Month" },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={recurringNextPaymentRows}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="appeals" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Appeals Performance
                </h3>
                <ReportExportButton
                  filename="appeals-performance.csv"
                  columns={[
                    { key: "label", label: "Appeal", getValue: (row) => row.label },
                    {
                      key: "donationAmountPence",
                      label: "Donations",
                      getValue: (row) => formatAmount(row.donationAmountPence),
                    },
                    {
                      key: "offlineAmountPence",
                      label: "Offline",
                      getValue: (row) => formatAmount(row.offlineAmountPence),
                    },
                    {
                      key: "collectionAmountPence",
                      label: "Collections",
                      getValue: (row) => formatAmount(row.collectionAmountPence),
                    },
                    { key: "totalPence", label: "Total", getValue: (row) => formatAmount(row.totalPence) },
                  ]}
                  data={appealsReportRows}
                />
              </div>
              <ReportTable
                columns={[
                  { key: "label", header: "Appeal" },
                  {
                    key: "donationAmountPence",
                    header: "Donations",
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
                    key: "totalPence",
                    header: "Total",
                    align: "right",
                    render: (row) => formatAmount(row.totalPence),
                  },
                ]}
                data={appealsReportRows.map((row) => ({ id: row.appealId || "unassigned", ...row }))}
              />
            </TabsContent>

            <TabsContent value="operations" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Operations (Refunds & Failures)
                </h3>
              </div>
              <Tabs defaultValue="refunds">
                <TabsList className="flex flex-wrap">
                  <TabsTrigger value="refunds">Refunds</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>

                <TabsContent value="refunds" className="space-y-3 mt-4">
                  <ReportTable
                    columns={[
                      { key: "label", header: "Status" },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={refundRows}
                  />
                </TabsContent>

                <TabsContent value="failed" className="space-y-3 mt-4">
                  <ReportTable
                    columns={[
                      { key: "label", header: "Status" },
                      { key: "count", header: "Count", align: "right", render: (row) => row.count ?? 0 },
                      {
                        key: "amountPence",
                        header: "Amount",
                        align: "right",
                        render: (row) => formatAmount(row.amountPence),
                      },
                    ]}
                    data={failedRows}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="staff" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Staff Performance
                </h3>
                <ReportExportButton
                  filename="staff-report.csv"
                  columns={[
                    { key: "label", label: "Staff", getValue: (row) => row.label },
                    { key: "offlineIncomePence", label: "Offline income", getValue: (row) => formatAmount(row.offlineIncomePence) },
                    { key: "offlineIncomeCount", label: "Offline count", getValue: (row) => row.offlineIncomeCount },
                    { key: "collectionsPence", label: "Collections", getValue: (row) => formatAmount(row.collectionsPence) },
                    { key: "collectionsCount", label: "Collections count", getValue: (row) => row.collectionsCount },
                    { key: "waterDonationsPence", label: "Water donations", getValue: (row) => formatAmount(row.waterDonationsPence) },
                    { key: "waterDonationsCount", label: "Water count", getValue: (row) => row.waterDonationsCount },
                    { key: "sponsorshipDonationsPence", label: "Sponsorship", getValue: (row) => formatAmount(row.sponsorshipDonationsPence) },
                    { key: "sponsorshipDonationsCount", label: "Sponsorship count", getValue: (row) => row.sponsorshipDonationsCount },
                    { key: "totalPence", label: "Total", getValue: (row) => formatAmount(row.totalPence) },
                    { key: "totalCount", label: "Total count", getValue: (row) => row.totalCount },
                  ]}
                  data={byStaffRows}
                />
              </div>
              <ReportTable
                columns={[
                  { key: "label", header: "Staff" },
                  {
                    key: "offlineIncomePence",
                    header: "Offline income",
                    align: "right",
                    render: (row) => formatAmount(row.offlineIncomePence),
                  },
                  { key: "offlineIncomeCount", header: "Offline #", align: "right", render: (row) => row.offlineIncomeCount },
                  {
                    key: "collectionsPence",
                    header: "Collections",
                    align: "right",
                    render: (row) => formatAmount(row.collectionsPence),
                  },
                  { key: "collectionsCount", header: "Coll. #", align: "right", render: (row) => row.collectionsCount },
                  {
                    key: "waterDonationsPence",
                    header: "Water",
                    align: "right",
                    render: (row) => formatAmount(row.waterDonationsPence),
                  },
                  { key: "waterDonationsCount", header: "Water #", align: "right", render: (row) => row.waterDonationsCount },
                  {
                    key: "sponsorshipDonationsPence",
                    header: "Sponsorship",
                    align: "right",
                    render: (row) => formatAmount(row.sponsorshipDonationsPence),
                  },
                  { key: "sponsorshipDonationsCount", header: "Spons. #", align: "right", render: (row) => row.sponsorshipDonationsCount },
                  {
                    key: "totalPence",
                    header: "Total",
                    align: "right",
                    render: (row) => formatAmount(row.totalPence),
                  },
                  { key: "totalCount", header: "Total #", align: "right", render: (row) => row.totalCount },
                ]}
                data={byStaffRows.map((row) => ({ id: row.staffId, ...row }))}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
