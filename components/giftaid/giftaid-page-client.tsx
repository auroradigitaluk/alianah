"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReportsDateFilter } from "@/components/reports/reports-date-filter"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import type { GiftAidScheduleResponse, GiftAidScheduleRow } from "@/lib/giftaid"
import { DonorDetailsDialog, type DonorDetails } from "@/components/donor-details-dialog"
import { Loader2 } from "lucide-react"

type RangeState = {
  startDate: Date | null
  endDate: Date | null
}

const defaultRange: RangeState = { startDate: null, endDate: null }

const formatAmount = (value?: number | null) => (value ? formatCurrency(value) : "£0.00")

const formatAmountPlain = (amountPence: number) => (amountPence / 100).toFixed(2)

const calculateClaimable = (amountPence: number) => Math.round(amountPence * 0.25)

const formatDonationDate = (isoDate: string) => {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ""
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear()).slice(-2)
  return `${day}/${month}/${year}`
}

const normalizePostcode = (value: string | null) => (value ? value.toUpperCase().trim() : "")

const normalizeTitle = (value: string | null) => (value ? value.trim().slice(0, 4) : "")

const buildScheduleRows = (rows: GiftAidScheduleRow[]) =>
  rows.map((row, index) => ({
    item: index + 1,
    title: normalizeTitle(row.title),
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    houseNumber: row.houseNumber || "",
    postcode: normalizePostcode(row.postcode),
    aggregated: "",
    sponsored: "",
    donationDate: formatDonationDate(row.donationDate),
    amount: formatAmountPlain(row.amountPence),
  }))

const buildDonorSummaries = (rows: GiftAidScheduleRow[], isEligible: boolean) => {
  const map = new Map<
    string,
    {
      donorId: string
      name: string
      email: string | null
      phone: string | null
      amountPence: number
      count: number
      claimedCount: number
      eligible: boolean
    }
  >()
  rows.forEach((row) => {
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || "Unknown donor"
    const key = row.donorId || name.toLowerCase()
    const current = map.get(key)
    if (current) {
      current.amountPence += row.amountPence
      current.count += 1
      current.claimedCount += row.giftAidClaimed ? 1 : 0
    } else {
      map.set(key, {
        donorId: row.donorId,
        name,
        email: row.email || null,
        phone: row.phone || null,
        amountPence: row.amountPence,
        count: 1,
        claimedCount: row.giftAidClaimed ? 1 : 0,
        eligible: isEligible,
      })
    }
  })
  return Array.from(map.values()).sort((a, b) => b.amountPence - a.amountPence)
}

const downloadCsv = (filename: string, rows: string[][]) => {
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(",") || cell.includes("\"") || cell.includes("\n")) {
            return `"${cell.replace(/"/g, "\"\"")}"`
          }
          return cell
        })
        .join(",")
    )
    .join("\n")
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function GiftAidPageClient() {
  const [range, setRange] = useState<RangeState>(defaultRange)
  const [data, setData] = useState<GiftAidScheduleResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDonor, setSelectedDonor] = useState<DonorDetails | null>(null)
  const [donorLoadingId, setDonorLoadingId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<Record<string, boolean>>({})

  const fetchGiftAid = useCallback(async (nextRange: RangeState) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (nextRange.startDate && nextRange.endDate) {
        params.set("start", nextRange.startDate.toISOString())
        params.set("end", nextRange.endDate.toISOString())
      }
      const response = await fetch(`/api/admin/giftaid?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to load Gift Aid report")
      }
      const payload = (await response.json()) as GiftAidScheduleResponse
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Gift Aid report")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGiftAid(range)
  }, [fetchGiftAid, range])

  const handleRangeChange = useCallback((nextRange: RangeState) => {
    setRange(nextRange)
  }, [])

  const handleOpenDonor = useCallback(async (donorId: string) => {
    if (!donorId) return
    setDonorLoadingId(donorId)
    try {
      const response = await fetch(`/api/admin/donors/${donorId}`)
      if (!response.ok) {
        throw new Error("Failed to load donor details")
      }
      const payload = (await response.json()) as DonorDetails
      setSelectedDonor(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load donor details")
    } finally {
      setDonorLoadingId(null)
    }
  }, [])

  const handleMarkClaimed = useCallback(async () => {
    setLoading(true)
    try {
      await fetch("/api/admin/giftaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: range.startDate?.toISOString(),
          end: range.endDate?.toISOString(),
        }),
      })
      await fetchGiftAid(range)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark claimed donations")
    } finally {
      setLoading(false)
    }
  }, [fetchGiftAid, range])

  const handleMarkEligible = useCallback(
    async (donorId: string) => {
      if (!donorId) return
      setUpdating((prev) => ({ ...prev, [donorId]: true }))
      try {
        const response = await fetch("/api/admin/giftaid", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            donorId,
            start: range.startDate?.toISOString(),
            end: range.endDate?.toISOString(),
          }),
        })
        if (!response.ok) {
          throw new Error("Failed to update eligibility")
        }
        await fetchGiftAid(range)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update eligibility")
      } finally {
        setUpdating((prev) => ({ ...prev, [donorId]: false }))
      }
    },
    [fetchGiftAid, range]
  )

  const eligibleRows = useMemo(() => data?.eligible.rows || [], [data])
  const ineligibleRows = useMemo(() => data?.ineligible.rows || [], [data])
  const eligibleSummaryRows = useMemo(() => buildDonorSummaries(eligibleRows, true), [eligibleRows])
  const ineligibleSummaryRows = useMemo(() => buildDonorSummaries(ineligibleRows, false), [ineligibleRows])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Gift Aid</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Export HMRC Gift Aid schedule rows in the exact column order.
          </p>
        </div>
        <ReportsDateFilter onRangeChange={handleRangeChange} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading Gift Aid export…</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : data ? (
        <Tabs defaultValue="eligible">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="eligible">Gift Aid eligible</TabsTrigger>
            <TabsTrigger value="ineligible">No Gift Aid</TabsTrigger>
          </TabsList>

          <TabsContent value="eligible" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total Gift Aid eligible £</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatAmount(data.eligible.summary.totalAmountPence)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total donations</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{data.eligible.summary.totalCount}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total claimable</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatAmount(calculateClaimable(data.eligible.summary.totalAmountPence))}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Eligible donations</p>
                <p className="text-xs text-muted-foreground">
                  {data.eligible.summary.totalCount} donations • {formatAmount(data.eligible.summary.totalAmountPence)}
                </p>
              </div>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  const scheduleRows = buildScheduleRows(eligibleRows)
                  const csvRows = [
                    [
                      "Item",
                      "Title",
                      "First name or initial",
                      "Last name",
                      "House name or number",
                      "Postcode",
                      "Aggregated donations",
                      "Sponsored event",
                      "Donation date",
                      "Amount",
                    ],
                    ...scheduleRows.map((row) => [
                      String(row.item),
                      row.title,
                      row.firstName,
                      row.lastName,
                      row.houseNumber,
                      row.postcode,
                      row.aggregated,
                      row.sponsored,
                      row.donationDate,
                      row.amount,
                    ]),
                  ]
                  downloadCsv("giftaid-eligible.csv", csvRows)
                    handleMarkClaimed()
                }}
              >
                Export HMRC CSV
              </Button>
            </div>

              <Card>
                <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Donor summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Full name</TableHead>
                        <TableHead className="text-right">Amount £</TableHead>
                        <TableHead className="text-right">Total donations</TableHead>
                        <TableHead className="text-right">Gift Aid</TableHead>
                        <TableHead className="text-right">Claimed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibleSummaryRows.map((row) => (
                        <TableRow
                          key={row.donorId || row.name}
                          className={`cursor-pointer ${row.donorId === donorLoadingId ? "opacity-60" : ""}`}
                          onClick={() => handleOpenDonor(row.donorId)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{row.name}</span>
                              {row.donorId === donorLoadingId ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatAmount(row.amountPence)}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              ✓
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                                row.claimedCount === row.count
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {row.claimedCount === row.count ? "✓" : "×"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="ineligible" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total not eligible £</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">
                  {formatAmount(data.ineligible.summary.totalAmountPence)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total donations</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{data.ineligible.summary.totalCount}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total claimable</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">£0.00</CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Not eligible for Gift Aid</p>
                <p className="text-xs text-muted-foreground">
                  {data.ineligible.summary.totalCount} donations •{" "}
                  {formatAmount(data.ineligible.summary.totalAmountPence)}
                </p>
              </div>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  const scheduleRows = buildScheduleRows(ineligibleRows)
                  const csvRows = [
                    [
                      "Item",
                      "Title",
                      "First name or initial",
                      "Last name",
                      "House name or number",
                      "Postcode",
                      "Aggregated donations",
                      "Sponsored event",
                      "Donation date",
                      "Amount",
                    ],
                    ...scheduleRows.map((row) => [
                      String(row.item),
                      row.title,
                      row.firstName,
                      row.lastName,
                      row.houseNumber,
                      row.postcode,
                      row.aggregated,
                      row.sponsored,
                      row.donationDate,
                      row.amount,
                    ]),
                  ]
                  downloadCsv("giftaid-ineligible.csv", csvRows)
                }}
              >
                Export HMRC CSV
              </Button>
            </div>

              <Card>
                <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Donor summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Full name</TableHead>
                        <TableHead className="text-right">Amount £</TableHead>
                        <TableHead className="text-right">Total donations</TableHead>
                        <TableHead className="text-right">Gift Aid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ineligibleSummaryRows.map((row) => (
                        <TableRow
                          key={row.donorId || row.name}
                          className={`cursor-pointer ${row.donorId === donorLoadingId ? "opacity-60" : ""}`}
                          onClick={() => handleOpenDonor(row.donorId)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span>{row.name}</span>
                                {row.donorId === donorLoadingId ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : null}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {row.email || "-"} {row.phone ? `• ${row.phone}` : ""}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatAmount(row.amountPence)}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleMarkEligible(row.donorId)
                              }}
                              disabled={updating[row.donorId]}
                            >
                              {updating[row.donorId] ? "Updating..." : "Mark eligible"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      ) : null}
      <DonorDetailsDialog
        donor={selectedDonor}
        open={!!selectedDonor}
        onOpenChange={(open) => !open && setSelectedDonor(null)}
      />
    </div>
  )
}
