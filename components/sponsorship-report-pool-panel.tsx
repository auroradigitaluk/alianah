"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { IconTrash, IconChevronLeft, IconChevronRight, IconExternalLink } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export interface PoolEntry {
  id: string
  pdfUrl: string
  fileName: string | null
  childCode: string | null
  createdAt: string
  isAvailable: boolean
  assignedDonationId: string | null
}

interface SponsorshipReportPoolPanelProps {
  projectId: string
  /** When set, show radio selection for available entries only */
  selectable?: boolean
  selectedEntryId?: string | null
  onSelectEntry?: (entryId: string) => void
  compact?: boolean
  showUpload?: boolean
  onCountsChange?: (total: number, available: number) => void
}

export function SponsorshipReportPoolPanel({
  projectId,
  selectable = false,
  selectedEntryId,
  onSelectEntry,
  compact = false,
  showUpload = !selectable,
  onCountsChange,
}: SponsorshipReportPoolPanelProps) {
  const [poolTotal, setPoolTotal] = useState(0)
  const [poolAvailable, setPoolAvailable] = useState(0)
  const [items, setItems] = useState<PoolEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingPool, setUploadingPool] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState(selectable ? "available" : "all")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchDebounced, setSearchDebounced] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchPool = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        list: "true",
        page: String(page),
        pageSize: "50",
        status: selectable ? "available" : statusFilter,
      })
      if (searchDebounced) params.set("q", searchDebounced)
      const res = await fetch(`/api/admin/sponsorships/${projectId}/report-pool?${params}`)
      if (!res.ok) throw new Error("Failed to load pool")
      const data = await res.json()
      setPoolTotal(data.total ?? 0)
      setPoolAvailable(data.available ?? 0)
      setItems(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
      onCountsChange?.(data.total ?? 0, data.available ?? 0)
    } catch {
      toast.error("Failed to load report pool")
    } finally {
      setLoading(false)
    }
  }, [projectId, page, statusFilter, searchDebounced, selectable, onCountsChange])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchDebounced, selectable])

  useEffect(() => {
    fetchPool()
  }, [fetchPool])

  const handleUploadPoolFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !projectId) return
    if (files.length > 50) {
      toast.error("Maximum 50 files per upload")
      e.target.value = ""
      return
    }
    setUploadingPool(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append("file", file))
      const res = await fetch(`/api/admin/sponsorships/${projectId}/report-pool`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to upload")
      }
      const data = await res.json()
      setPoolTotal(data.total ?? poolTotal)
      setPoolAvailable(data.available ?? poolAvailable)
      onCountsChange?.(data.total ?? poolTotal, data.available ?? poolAvailable)
      toast.success(`${data.uploaded} report(s) added. ${data.available} available.`)
      setPage(1)
      await fetchPool()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload reports")
    } finally {
      setUploadingPool(false)
      e.target.value = ""
    }
  }

  const handleDelete = async (entryId: string) => {
    if (!confirm("Remove this PDF from the pool? This cannot be undone.")) return
    setDeletingId(entryId)
    try {
      const res = await fetch(
        `/api/admin/sponsorships/${projectId}/report-pool/${entryId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete")
      }
      const data = await res.json()
      setPoolTotal(data.total ?? poolTotal)
      setPoolAvailable(data.available ?? poolAvailable)
      onCountsChange?.(data.total ?? poolTotal, data.available ?? poolAvailable)
      if (selectedEntryId === entryId) onSelectEntry?.("")
      toast.success("Report removed from pool")
      await fetchPool()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div>
        <p className="text-xs text-muted-foreground">
          Name PDFs by child ID (e.g. <span className="font-mono">001.pdf</span>, <span className="font-mono">042.pdf</span>).
          {selectable
            ? " Select which report to send when marking a sponsor complete."
            : " Manage available reports; assigned reports cannot be deleted."}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {showUpload && (
            <>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleUploadPoolFiles}
                disabled={uploadingPool}
                className="hidden"
                id={`report-pool-input-${projectId}`}
              />
              <Button
                type="button"
                variant="outline"
                size={compact ? "sm" : "default"}
                onClick={() => document.getElementById(`report-pool-input-${projectId}`)?.click()}
                disabled={uploadingPool}
              >
                {uploadingPool ? "Uploading..." : "Upload PDFs (up to 50)"}
              </Button>
            </>
          )}
          <span className="text-sm text-muted-foreground">
            {poolTotal} in pool · {poolAvailable} available
          </span>
        </div>
      </div>

      {!selectable && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search by child ID or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {selectable && (
        <Input
          placeholder="Search available reports (e.g. 001)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      )}

      <div className="border rounded-lg overflow-hidden">
        {loading && items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Loading reports...</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {searchDebounced ? "No reports match your search." : "No reports in pool yet. Upload PDFs above."}
          </p>
        ) : (
          <ul className="divide-y max-h-[min(420px,50vh)] overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40",
                  selectable && selectedEntryId === item.id && "bg-primary/5"
                )}
              >
                {selectable && (
                  <input
                    type="radio"
                    name="pool-entry"
                    checked={selectedEntryId === item.id}
                    onChange={() => onSelectEntry?.(item.id)}
                    className="shrink-0"
                  />
                )}
                <span className="font-mono font-semibold min-w-[3rem]">
                  {item.childCode || "—"}
                </span>
                <span className="text-muted-foreground truncate flex-1" title={item.fileName ?? undefined}>
                  {item.fileName ?? "report.pdf"}
                </span>
                {!selectable && (
                  <Badge variant={item.isAvailable ? "outline" : "secondary"} className="shrink-0 text-xs">
                    {item.isAvailable ? "Available" : "Assigned"}
                  </Badge>
                )}
                <a
                  href={item.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  title="Preview PDF"
                >
                  <IconExternalLink className="h-4 w-4" />
                </a>
                {!selectable && item.isAvailable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                    title="Delete from pool"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <IconChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <IconChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
