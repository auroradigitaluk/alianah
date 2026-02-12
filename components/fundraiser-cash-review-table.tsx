"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Check, X, Loader2 } from "lucide-react"

interface PendingCashDonation {
  id: string
  fundraiserId: string
  amountPence: number
  donorName: string | null
  notes: string | null
  receivedAt: string
  status: string
  createdAt: string
  fundraiser: {
    id: string
    title: string
    slug: string
    fundraiserName: string
    email: string
    campaignTitle: string
  }
}

export function FundraiserCashReviewTable() {
  const [list, setList] = useState<PendingCashDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/fundraisers/cash-donations/pending", {
        credentials: "same-origin",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : `Failed to load (${res.status})`)
      }
      setList(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
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
      setList((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading pending cash donations…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No pending cash donations. Fundraisers’ cash submissions will appear here for review.
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fundraiser</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead className="text-right tabular-nums">Amount</TableHead>
            <TableHead>Donor name</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((d) => (
            <TableRow key={d.id}>
              <TableCell>
                <div className="font-medium">{d.fundraiser.fundraiserName}</div>
                <div className="text-xs text-muted-foreground">{d.fundraiser.title}</div>
                <div className="text-xs text-muted-foreground">{d.fundraiser.email}</div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {d.fundraiser.campaignTitle}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(d.amountPence)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {d.donorName ?? "—"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={d.notes ?? undefined}>
                {d.notes ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(d.receivedAt)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(d.createdAt)}
              </TableCell>
              <TableCell className="text-right">
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
  )
}
