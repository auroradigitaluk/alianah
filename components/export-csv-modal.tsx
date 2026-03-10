"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Download } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ExportCsvType =
  | "donations"
  | "recurring"
  | "offline-income"
  | "collections"
  | "donors"

type ExportCsvModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exportType: ExportCsvType
  onExport: (range: { from: Date; to: Date }) => Promise<void>
}

export function ExportCsvModal({
  open,
  onOpenChange,
  exportType,
  onExport,
}: ExportCsvModalProps) {
  const [range, setRange] = React.useState<DateRange | undefined>(undefined)
  const [isExporting, setIsExporting] = React.useState(false)
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const applyRange = () => {
    setPopoverOpen(false)
  }

  const handleClear = () => {
    setRange(undefined)
  }

  const handleExport = async () => {
    if (!range?.from || !range?.to) return
    setIsExporting(true)
    try {
      await onExport({ from: range.from, to: range.to })
      onOpenChange(false)
      setRange(undefined)
    } finally {
      setIsExporting(false)
    }
  }

  const labels: Record<ExportCsvType, string> = {
    donations: "Donations",
    recurring: "Recurring donations",
    "offline-income": "Offline income",
    collections: "Collections",
    donors: "Donors",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export CSV</DialogTitle>
          <DialogDescription>
            Select a date range to export {labels[exportType].toLowerCase()}. The CSV will include all available data.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !range?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {range?.from && range?.to ? (
                  <>
                    {format(range.from, "LLL dd, y")} – {format(range.to, "LLL dd, y")}
                  </>
                ) : (
                  "Pick date range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" data-side="bottom">
              <Calendar
                mode="range"
                selected={range}
                onSelect={(selected) => setRange(selected ?? undefined)}
                defaultMonth={range?.from}
              />
              <div className="flex items-center justify-end gap-2 border-t p-3">
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Clear
                </Button>
                <Button size="sm" onClick={applyRange} disabled={!range?.from || !range?.to}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!range?.from || !range?.to || isExporting}
          >
            {isExporting ? (
              "Exporting…"
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ExportCsvButtonProps = {
  exportType: ExportCsvType
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}

export function ExportCsvButton({
  exportType,
  variant = "outline",
  size = "default",
  className,
}: ExportCsvButtonProps) {
  const [open, setOpen] = React.useState(false)

  const handleExport = async (range: { from: Date; to: Date }) => {
    const from = range.from.toISOString()
    const to = range.to.toISOString()
    const res = await fetch(
      `/api/admin/export/${exportType}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? "Export failed")
    }
    const blob = await res.blob()
    const filename =
      res.headers.get("Content-Disposition")?.match(/filename="?([^";\n]+)"?/)?.[1] ??
      `${exportType}-export.csv`
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <ExportCsvModal
        open={open}
        onOpenChange={setOpen}
        exportType={exportType}
        onExport={handleExport}
      />
    </>
  )
}
