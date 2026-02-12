"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { IconCheck, IconX, IconCircleCheckFilled, IconLoader, IconClock, IconCircleX } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime, formatDonorName, formatPaymentMethod, displayDonorEmail, formatAdminUserName } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

interface CashDonation {
  id: string
  amountPence: number
  donorName: string | null
  notes: string | null
  receivedAt: string
  status: string
  reviewedAt: string | null
  reviewedBy: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  } | null
  createdAt: string
}

interface Donation {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  paymentMethod: string
  giftAid: boolean
  transactionId: string | null
  createdAt: string
  completedAt: string | null
  donor: {
    title?: string | null
    firstName: string
    lastName: string
    email: string
  }
  isAnonymous?: boolean | null
  appeal?: {
    title: string
  } | null
  product?: {
    name: string
  } | null
}

interface FundraiserDonationsViewProps {
  fundraiserId: string | null
  fundraiserTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FundraiserDonationsView({
  fundraiserId,
  fundraiserTitle,
  open,
  onOpenChange,
}: FundraiserDonationsViewProps) {
  const [donations, setDonations] = useState<Donation[]>([])
  const [cashDonations, setCashDonations] = useState<CashDonation[]>([])
  const [loading, setLoading] = useState(false)
  const [cashLoading, setCashLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cashError, setCashError] = useState<string | null>(null)
  const [cashSubmitting, setCashSubmitting] = useState(false)
  const [cashForm, setCashForm] = useState({
    amountPounds: "",
    donorName: "",
    receivedAt: "",
    notes: "",
  })

  useEffect(() => {
    if (open && fundraiserId) {
      fetchDonations()
      fetchCashDonations()
    } else {
      setDonations([])
      setCashDonations([])
      setError(null)
      setCashError(null)
    }
  }, [open, fundraiserId])

  const fetchDonations = async () => {
    if (!fundraiserId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/fundraisers/${fundraiserId}/donations`)
      if (!response.ok) throw new Error("Failed to fetch donations")
      const data = await response.json()
      setDonations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load donations")
      console.error("Error fetching donations:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCashDonations = async () => {
    if (!fundraiserId) return
    setCashLoading(true)
    setCashError(null)
    try {
      const response = await fetch(`/api/fundraisers/${fundraiserId}/cash-donations`)
      if (!response.ok) throw new Error("Failed to fetch cash donations")
      const data = await response.json()
      setCashDonations(data)
    } catch (err) {
      setCashError(err instanceof Error ? err.message : "Failed to load cash donations")
      console.error("Error fetching cash donations:", err)
    } finally {
      setCashLoading(false)
    }
  }

  const submitCashDonation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fundraiserId) return
    const amountPounds = parseFloat(cashForm.amountPounds)
    if (Number.isNaN(amountPounds) || amountPounds <= 0) {
      setCashError("Please enter a valid amount")
      return
    }
    const amountPence = Math.round(amountPounds * 100)
    setCashSubmitting(true)
    setCashError(null)
    try {
      const res = await fetch(`/api/fundraisers/${fundraiserId}/cash-donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence,
          donorName: cashForm.donorName.trim() || undefined,
          notes: cashForm.notes.trim() || undefined,
          receivedAt: cashForm.receivedAt ? new Date(cashForm.receivedAt).toISOString() : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to submit")
      }
      setCashForm({ amountPounds: "", donorName: "", receivedAt: "", notes: "" })
      await fetchCashDonations()
    } catch (err) {
      setCashError(err instanceof Error ? err.message : "Failed to submit cash donation")
    } finally {
      setCashSubmitting(false)
    }
  }

  const totalOnline = donations
    .filter((d) => d.status === "COMPLETED")
    .reduce((sum, d) => sum + d.amountPence, 0)
  const totalCashApproved = cashDonations
    .filter((d) => d.status === "APPROVED")
    .reduce((sum, d) => sum + d.amountPence, 0)
  const totalRaised = totalOnline + totalCashApproved
  const completedCount = donations.filter((d) => d.status === "COMPLETED").length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Donations for {fundraiserTitle}</SheetTitle>
          <SheetDescription>
            View all donations made to this fundraiser
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 p-4 border border-destructive rounded-md bg-destructive/10">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="overflow-y-auto h-[calc(100vh-120px)] mt-6 pr-2">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Raised</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalRaised)}</p>
                {totalCashApproved > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    incl. {formatCurrency(totalCashApproved)} from cash (approved)
                  </p>
                )}
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Donations</p>
                <p className="text-2xl font-bold mt-1">{completedCount}</p>
              </div>
            </div>

            {/* Cash donations from family & friends */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Cash donations from family & friends</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Add cash you&apos;ve received offline. These will be reviewed by staff before counting towards your total.
              </p>
              <form onSubmit={submitCashDonation} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cash-amount">Amount (£) *</Label>
                    <Input
                      id="cash-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={cashForm.amountPounds}
                      onChange={(e) => setCashForm((f) => ({ ...f, amountPounds: e.target.value }))}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cash-donor">Donor name (optional)</Label>
                    <Input
                      id="cash-donor"
                      transform="titleCase"
                      placeholder="e.g. Aunt Sarah"
                      value={cashForm.donorName}
                      onChange={(e) => setCashForm((f) => ({ ...f, donorName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cash-date">Date received (optional)</Label>
                    <Input
                      id="cash-date"
                      type="date"
                      value={cashForm.receivedAt}
                      onChange={(e) => setCashForm((f) => ({ ...f, receivedAt: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cash-notes">Notes (optional)</Label>
                  <Textarea
                    id="cash-notes"
                    placeholder="Any details..."
                    value={cashForm.notes}
                    onChange={(e) => setCashForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={cashSubmitting}>
                  {cashSubmitting ? "Submitting…" : "Submit cash donation"}
                </Button>
              </form>
              {cashError && (
                <p className="text-sm text-destructive mt-2">{cashError}</p>
              )}
              {cashLoading ? (
                <div className="mt-4 space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : cashDonations.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Your cash donation submissions</p>
                  {cashDonations.map((d) => (
                    <div key={d.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold">{formatCurrency(d.amountPence)}</span>
                        <Badge
                          variant={
                            d.status === "APPROVED"
                              ? "default"
                              : d.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                          }
                          className="gap-1"
                        >
                          {d.status === "APPROVED" && <IconCircleCheckFilled className="size-3" />}
                          {d.status === "REJECTED" && <IconCircleX className="size-3" />}
                          {d.status === "PENDING_REVIEW" && <IconClock className="size-3" />}
                          {d.status === "PENDING_REVIEW"
                            ? "Pending review"
                            : d.status === "APPROVED"
                              ? "Approved"
                              : "Rejected"}
                        </Badge>
                      </div>
                      {d.donorName && <p className="text-muted-foreground mt-1">{d.donorName}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Received {formatDate(d.receivedAt)} · Submitted {formatDate(d.createdAt)}
                        {d.reviewedAt && d.reviewedBy && (
                          <> · {d.status === "APPROVED" ? "Approved" : "Rejected"} by {formatAdminUserName(d.reviewedBy) || d.reviewedBy.email} on {formatDate(d.reviewedAt)}</>
                        )}
                      </p>
                      {d.notes && <p className="text-xs mt-1">{d.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <Separator className="my-6" />

            {donations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No donations yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Donations will appear here once supporters start contributing
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">
                            {formatCurrency(donation.amountPence)}
                          </p>
                          <Badge
                            variant={donation.status === "COMPLETED" ? "default" : "outline"}
                            className="px-1.5"
                          >
                            {donation.status === "COMPLETED" ? (
                              <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
                            ) : (
                              <IconLoader className="mr-1 size-3" />
                            )}
                            {formatEnum(donation.status)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">
                          {donation.isAnonymous ? "Anonymous" : formatDonorName(donation.donor)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {donation.isAnonymous ? "Anonymous" : displayDonorEmail(donation.donor.email)}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Date
                        </p>
                        <p className="font-medium">
                          {formatDate(
                            donation.completedAt
                              ? new Date(donation.completedAt)
                              : new Date(donation.createdAt)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Payment Method
                        </p>
                        <p className="font-medium">{formatPaymentMethod(donation.paymentMethod)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Donation Type
                        </p>
                        <p className="font-medium">{formatEnum(donation.donationType)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Frequency
                        </p>
                        <p className="font-medium">{formatEnum(donation.frequency)}</p>
                      </div>
                      {donation.product && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Product
                          </p>
                          <p className="font-medium">{donation.product.name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Gift Aid
                        </p>
                        <div className="flex items-center gap-1">
                          {donation.giftAid ? (
                            <>
                              <IconCheck className="h-4 w-4 text-primary" />
                              <span className="font-medium">Yes</span>
                            </>
                          ) : (
                            <>
                              <IconX className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">No</span>
                            </>
                          )}
                        </div>
                      </div>
                      {donation.transactionId && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Transaction ID
                          </p>
                          <p className="font-mono text-xs">{donation.transactionId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
