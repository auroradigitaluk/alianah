"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Copy, Pencil, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { formatCurrencyWhole } from "@/lib/utils"

export interface MasjidRow {
  id: string
  country: string
  slug: string
  priceFromPence: number
  priceToPence: number | null
  isActive: boolean
  allowFundraising: boolean
  stats: { raisedPence: number; donationCount: number; fundraiserCount: number }
}

export function MasjidProjectsTable({ rows, canManage }: { rows: MasjidRow[]; canManage: boolean }) {
  const router = useRouter()
  const [copied, setCopied] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<string | null>(null)

  async function copyLink(slug: string) {
    const url = `${window.location.origin}/masjids/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(slug)
      toast.success("Link copied")
      setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.error("Could not copy link")
    }
  }

  async function handleDelete(row: MasjidRow) {
    if (!confirm(`Remove ${row.country}? Its donations are kept but the page is hidden.`)) return
    setDeleting(row.id)
    try {
      const res = await fetch(`/api/admin/masjid-donations/${row.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete")
      }
      toast.success("Removed")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeleting(null)
    }
  }

  const priceLabel = (row: MasjidRow) =>
    row.priceToPence
      ? `${formatCurrencyWhole(row.priceFromPence)}–${formatCurrencyWhole(row.priceToPence)}`
      : formatCurrencyWhole(row.priceFromPence)

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No masjid countries yet.{" "}
        {canManage && (
          <Link href="/admin/masjid-donations/new" className="text-primary underline">
            Add the first one
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Country</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Raised</th>
            <th className="px-4 py-3">Donations</th>
            <th className="px-4 py-3">Fundraisers</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{row.country}</td>
              <td className="px-4 py-3">{priceLabel(row)}</td>
              <td className="px-4 py-3 font-semibold">{formatCurrencyWhole(row.stats.raisedPence)}</td>
              <td className="px-4 py-3">{row.stats.donationCount}</td>
              <td className="px-4 py-3">{row.stats.fundraiserCount}</td>
              <td className="px-4 py-3">
                <Badge variant={row.isActive ? "default" : "secondary"}>
                  {row.isActive ? "Active" : "Hidden"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Copy link" onClick={() => copyLink(row.slug)}>
                    {copied === row.slug ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" title="Open page" asChild>
                    <Link href={`/masjids/${row.slug}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  {canManage && (
                    <>
                      <Button variant="ghost" size="icon" title="Edit" asChild>
                        <Link href={`/admin/masjid-donations/${row.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove"
                        disabled={deleting === row.id}
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
