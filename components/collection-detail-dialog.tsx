"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatEnum, formatDateTime } from "@/lib/utils"
import { Pencil, Trash2 } from "lucide-react"

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  JUMMAH: "Jummah",
  RAMADAN: "Ramadan",
  EID: "Eid",
  SPECIAL: "Special",
  OTHER: "Other",
}

export type CollectionItem = {
  id: string
  amountPence: number
  donationType: string
  type: string
  collectedAt: Date | string
  masjidId?: string | null
  otherLocationName?: string | null
  appealId?: string | null
  masjid?: { name: string } | null
  appeal?: { title: string } | null
  notes?: string | null
  addedByName?: string | null
  sadaqahPence?: number
  zakatPence?: number
  lillahPence?: number
  cardPence?: number
}

type Props = {
  item: CollectionItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit?: boolean
  showLoggedBy?: boolean
  onEdit?: (item: CollectionItem) => void
  onDelete?: (item: CollectionItem) => void
}

export function CollectionDetailDialog({
  item,
  open,
  onOpenChange,
  canEdit = false,
  showLoggedBy = true,
  onEdit,
  onDelete,
}: Props) {
  if (!item) return null

  const collectedAt = typeof item.collectedAt === "string" ? new Date(item.collectedAt) : item.collectedAt
  const totalPence = item.amountPence
  const hasBreakdown =
    (item.sadaqahPence ?? 0) + (item.zakatPence ?? 0) + (item.lillahPence ?? 0) + (item.cardPence ?? 0) > 0
  const sadaqahPence = hasBreakdown ? (item.sadaqahPence ?? 0) : item.donationType === "SADAQAH" ? totalPence : 0
  const zakatPence = hasBreakdown ? (item.zakatPence ?? 0) : item.donationType === "ZAKAT" ? totalPence : 0
  const lillahPence = hasBreakdown ? (item.lillahPence ?? 0) : item.donationType === "LILLAH" ? totalPence : 0
  const cardPence = hasBreakdown ? (item.cardPence ?? 0) : item.donationType === "GENERAL" ? totalPence : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Collection Details</DialogTitle>
              <DialogDescription>
                {formatCurrency(totalPence)} collected from {item.masjid?.name || item.otherLocationName || "—"}
              </DialogDescription>
            </div>
            {canEdit && onEdit && onDelete && (
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Collection type
            </p>
            <Badge variant="secondary" className="text-sm font-medium">
              {COLLECTION_TYPE_LABELS[item.type] ?? formatEnum(item.type)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Location
              </p>
              <p className="text-sm font-medium">{item.masjid?.name || item.otherLocationName || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Appeal
              </p>
              <p className="text-sm font-medium">{item.appeal?.title || "—"}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Amounts
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Sadaqah</p>
                <p className="text-base font-semibold tabular-nums">{formatCurrency(sadaqahPence)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Zakat</p>
                <p className="text-base font-semibold tabular-nums">{formatCurrency(zakatPence)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Lillah</p>
                <p className="text-base font-semibold tabular-nums">{formatCurrency(lillahPence)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Card</p>
                <p className="text-base font-semibold tabular-nums">{formatCurrency(cardPence)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                <p className="text-base font-bold tabular-nums text-primary">{formatCurrency(totalPence)}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Collected at
              </p>
              <p className="text-sm font-medium">{formatDateTime(collectedAt)}</p>
            </div>
            {showLoggedBy && item.addedByName && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Logged by
                </p>
                <p className="text-sm font-medium">{item.addedByName}</p>
              </div>
            )}
          </div>

          {item.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{item.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
