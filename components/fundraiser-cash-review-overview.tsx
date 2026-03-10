"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Check, X, Loader2, Clock, CircleCheck, CircleX, ListOrdered, PoundSterling, User, Mail, Building2, Calendar, FileText, Banknote } from "lucide-react"

function sumAmountPence(list: { amountPence: number }[]): number {
  return list.reduce((s, d) => s + d.amountPence, 0)
}

function StatCards({
  count,
  totalPence,
  countLabel,
  totalLabel,
  variant,
}: {
  count: number
  totalPence: number
  countLabel: string
  totalLabel: string
  variant: "pending" | "approved" | "rejected"
}) {
  const styles = {
    pending: {
      card: "from-amber-500/10 via-amber-500/5 to-card border-amber-500/20 bg-amber-500/5",
      blur: "bg-amber-500/5",
      icon: "bg-amber-500/10 text-amber-600",
    },
    approved: {
      card: "from-emerald-500/10 via-emerald-500/5 to-card border-emerald-500/20 bg-emerald-500/5",
      blur: "bg-emerald-500/5",
      icon: "bg-emerald-500/10 text-emerald-600",
    },
    rejected: {
      card: "from-muted border-border bg-muted/30",
      blur: "bg-muted/50",
      icon: "bg-muted text-muted-foreground",
    },
  }[variant]
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
      <Card className={`relative overflow-hidden bg-gradient-to-br ${styles.card} border shadow-sm`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 ${styles.blur}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">{countLabel}</CardTitle>
          <div className={`rounded-lg p-2 ${styles.icon}`}>
            <ListOrdered className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">{count}</div>
        </CardContent>
      </Card>
      <Card className={`relative overflow-hidden bg-gradient-to-br ${styles.card} border shadow-sm`}>
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 ${styles.blur}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">{totalLabel}</CardTitle>
          <div className={`rounded-lg p-2 ${styles.icon}`}>
            <PoundSterling className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl font-bold">{formatCurrency(totalPence)}</div>
        </CardContent>
      </Card>
    </div>
  )
}

interface CashDonationRow {
  id: string
  fundraiserId: string | null
  amountPence: number
  donorName: string | null
  donationNumber?: string | null
  notes: string | null
  receivedAt: string
  status: string
  createdAt: string
  reviewedAt: string | null
  reviewedBy: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  fundraiser: {
    id: string
    title: string
    slug: string
    fundraiserName: string
    email: string
    campaignTitle: string
  } | null
}

function formatReviewer(reviewedBy: CashDonationRow["reviewedBy"]): string {
  if (!reviewedBy) return "—"
  const name = [reviewedBy.firstName, reviewedBy.lastName].filter(Boolean).join(" ").trim()
  return name || reviewedBy.email || "—"
}

function DetailModal({
  donation,
  open,
  onOpenChange,
  onApprove,
  onReject,
  actingId,
}: {
  donation: CashDonationRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  actingId: string | null
}) {
  if (!donation) return null
  const isPending = donation.status === "PENDING_REVIEW"
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Offline donation details</DialogTitle>
          <DialogDescription>
            Full details for this {isPending ? "pending" : donation.status.toLowerCase()} request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{donation.status.replace("_", " ")}</span>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Banknote className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-xl font-bold">{formatCurrency(donation.amountPence)}</p>
              </div>
            </div>
            {donation.donationNumber && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Order number</p>
                  <p className="font-mono text-sm">{donation.donationNumber}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Donor name</p>
                <p className="font-medium">{donation.donorName ?? "—"}</p>
              </div>
            </div>
            {(donation.notes ?? "").trim() && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{donation.notes}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Received at</p>
                <p className="text-sm">{formatDate(donation.receivedAt)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted at</p>
                <p className="text-sm">{formatDate(donation.createdAt)}</p>
              </div>
            </div>
          </div>
          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fundraiser</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{donation.fundraiser?.fundraiserName ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Page title</p>
                <p className="text-sm">{donation.fundraiser?.title ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm break-all">{donation.fundraiser?.email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Campaign</p>
                <p className="text-sm">{donation.fundraiser?.campaignTitle ?? "—"}</p>
              </div>
            </div>
          </div>
          {(donation.status === "APPROVED" || donation.status === "REJECTED") && (
            <>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {donation.status === "APPROVED" ? "Approved" : "Rejected"} by
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Reviewer</p>
                    <p className="text-sm">{formatReviewer(donation.reviewedBy)}</p>
                  </div>
                </div>
                {donation.reviewedAt && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm">{formatDate(donation.reviewedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {(donation.status === "PENDING_REVIEW" || donation.status === "APPROVED") && onReject && (
            <Button
              variant="destructive"
              onClick={() => {
                onReject(donation.id)
                onOpenChange(false)
              }}
              disabled={actingId === donation.id}
            >
              {actingId === donation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
              {donation.status === "APPROVED" ? "Reject" : "Reject"}
            </Button>
          )}
          {(donation.status === "PENDING_REVIEW" || donation.status === "REJECTED") && onApprove && (
            <Button
              onClick={() => {
                onApprove(donation.id)
                onOpenChange(false)
              }}
              disabled={actingId === donation.id}
            >
              {actingId === donation.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {donation.status === "REJECTED" ? "Approve" : "Approve"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FundraiserCashReviewOverview() {
  const [pending, setPending] = useState<CashDonationRow[]>([])
  const [approved, setApproved] = useState<CashDonationRow[]>([])
  const [rejected, setRejected] = useState<CashDonationRow[]>([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingApproved, setLoadingApproved] = useState(false)
  const [loadingRejected, setLoadingRejected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [selectedDonation, setSelectedDonation] = useState<CashDonationRow | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchByStatus = useCallback(async (status: "PENDING_REVIEW" | "APPROVED" | "REJECTED") => {
    const res = await fetch(
      `/api/admin/fundraisers/cash-donations?status=${status}`,
      { credentials: "same-origin" }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Failed to load (${res.status})`)
    return Array.isArray(data) ? data : []
  }, [])

  const loadPending = useCallback(async () => {
    setLoadingPending(true)
    setError(null)
    try {
      const data = await fetchByStatus("PENDING_REVIEW")
      setPending(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
      setPending([])
    } finally {
      setLoadingPending(false)
    }
  }, [fetchByStatus])

  const loadApproved = useCallback(async () => {
    setLoadingApproved(true)
    try {
      const data = await fetchByStatus("APPROVED")
      setApproved(data)
    } catch {
      setApproved([])
    } finally {
      setLoadingApproved(false)
    }
  }, [fetchByStatus])

  const loadRejected = useCallback(async () => {
    setLoadingRejected(true)
    try {
      const data = await fetchByStatus("REJECTED")
      setRejected(data)
    } catch {
      setRejected([])
    } finally {
      setLoadingRejected(false)
    }
  }, [fetchByStatus])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  const handleTabChange = (value: string) => {
    if (value === "approved" && approved.length === 0 && !loadingApproved) loadApproved()
    if (value === "rejected" && rejected.length === 0 && !loadingRejected) loadRejected()
  }

  const handleReview = async (
    id: string,
    status: "APPROVED" | "REJECTED",
    fromStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED"
  ) => {
    setActingId(id)
    try {
      const res = await fetch(`/api/admin/fundraisers/cash-donations/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to update")
      }
      if (fromStatus === "PENDING_REVIEW" || fromStatus === undefined) {
        setPending((prev) => prev.filter((d) => d.id !== id))
      } else if (fromStatus === "APPROVED") {
        setApproved((prev) => prev.filter((d) => d.id !== id))
        loadRejected()
      } else if (fromStatus === "REJECTED") {
        setRejected((prev) => prev.filter((d) => d.id !== id))
        loadApproved()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base sm:text-lg font-semibold">Offline to review</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Fundraisers can record offline contributions (e.g. cash, bank transfer). Review pending requests, and see approved or rejected history.
        </p>
      </div>

      <Tabs defaultValue="current" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="current" className="gap-2">
            <Clock className="h-4 w-4" />
            Current requests ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CircleCheck className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <CircleX className="h-4 w-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-0">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          <StatCards
            count={pending.length}
            totalPence={sumAmountPence(pending)}
            countLabel="Pending requests"
            totalLabel="Total pending amount"
            variant="pending"
          />
          {loadingPending ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading pending offline donations…
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              No pending offline donations. Fundraisers’ submissions will appear here for review.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fundraiser</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right tabular-nums">Amount</TableHead>
                    <TableHead className="text-left">Order No.</TableHead>
                    <TableHead>Donor name</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-[180px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedDonation(d)
                        setDetailOpen(true)
                      }}
                    >
                      <TableCell>
                        <div className="font-medium">{d.fundraiser?.fundraiserName ?? "Deleted fundraiser"}</div>
                        <div className="text-xs text-muted-foreground">{d.fundraiser?.title ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{d.fundraiser?.email ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.fundraiser?.campaignTitle ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(d.amountPence)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {d.donationNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.donorName ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={d.notes ?? undefined}>
                        {d.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(d.receivedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(d.createdAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleReview(d.id, "APPROVED")}
                            disabled={actingId === d.id}
                          >
                            {actingId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReview(d.id, "REJECTED")}
                            disabled={actingId === d.id}
                          >
                            {actingId === d.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-0">
          <StatCards
            count={approved.length}
            totalPence={sumAmountPence(approved)}
            countLabel="Approved donations"
            totalLabel="Total approved amount"
            variant="approved"
          />
          {loadingApproved ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading approved…
            </div>
          ) : approved.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              No approved offline donations yet.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fundraiser</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right tabular-nums">Amount</TableHead>
                    <TableHead className="text-left">Order No.</TableHead>
                    <TableHead>Donor name</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Approved by</TableHead>
                    <TableHead>Approved at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approved.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedDonation(d)
                        setDetailOpen(true)
                      }}
                    >
                      <TableCell>
                        <div className="font-medium">{d.fundraiser?.fundraiserName ?? "Deleted fundraiser"}</div>
                        <div className="text-xs text-muted-foreground">{d.fundraiser?.email ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.fundraiser?.campaignTitle ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(d.amountPence)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {d.donationNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.donorName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(d.receivedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatReviewer(d.reviewedBy)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.reviewedAt ? formatDate(d.reviewedAt) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-0">
          <StatCards
            count={rejected.length}
            totalPence={sumAmountPence(rejected)}
            countLabel="Rejected donations"
            totalLabel="Total rejected amount"
            variant="rejected"
          />
          {loadingRejected ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              Loading rejected…
            </div>
          ) : rejected.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              No rejected offline donations.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fundraiser</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right tabular-nums">Amount</TableHead>
                    <TableHead className="text-left">Order No.</TableHead>
                    <TableHead>Donor name</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Rejected by</TableHead>
                    <TableHead>Rejected at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejected.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedDonation(d)
                        setDetailOpen(true)
                      }}
                    >
                      <TableCell>
                        <div className="font-medium">{d.fundraiser?.fundraiserName ?? "Deleted fundraiser"}</div>
                        <div className="text-xs text-muted-foreground">{d.fundraiser?.email ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.fundraiser?.campaignTitle ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(d.amountPence)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {d.donationNumber ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{d.donorName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(d.receivedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatReviewer(d.reviewedBy)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.reviewedAt ? formatDate(d.reviewedAt) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DetailModal
        donation={selectedDonation}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setSelectedDonation(null)
        }}
        onApprove={
          selectedDonation
            ? (id) =>
                handleReview(id, "APPROVED", selectedDonation.status as "PENDING_REVIEW" | "APPROVED" | "REJECTED")
            : undefined
        }
        onReject={
          selectedDonation
            ? (id) =>
                handleReview(id, "REJECTED", selectedDonation.status as "PENDING_REVIEW" | "APPROVED" | "REJECTED")
            : undefined
        }
        actingId={actingId}
      />
    </div>
  )
}
