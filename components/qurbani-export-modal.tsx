"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Download } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const INCLUDE_GROUPS = [
  { id: "donor", label: "Donor names & contact (email, phone)" },
  { id: "donor_address", label: "Donor address" },
  { id: "billing", label: "Billing address" },
  { id: "payment", label: "Payment method & transaction ID" },
  { id: "giftaid", label: "Gift Aid" },
  { id: "notes", label: "Notes, qurbani names & anonymous flag" },
  { id: "fundraiser", label: "Fundraiser page details" },
  { id: "office", label: "Added by (office)" },
] as const

type IncludeId = (typeof INCLUDE_GROUPS)[number]["id"]

const SOURCE_OPTIONS = [
  { id: "website" as const, label: "Website checkout" },
  { id: "offline" as const, label: "Offline / office" },
  { id: "fundraiser" as const, label: "Fundraiser page" },
]

export type QurbaniExportModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  countries: { id: string; country: string }[]
}

export function QurbaniExportModal({ open, onOpenChange, countries }: QurbaniExportModalProps) {
  const [range, setRange] = React.useState<DateRange | undefined>(undefined)
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [isExporting, setIsExporting] = React.useState(false)

  const [countryTick, setCountryTick] = React.useState<Record<string, boolean>>({})
  const [sources, setSources] = React.useState<Record<string, boolean>>({
    website: true,
    offline: true,
    fundraiser: true,
  })
  const [include, setInclude] = React.useState<Record<IncludeId, boolean>>(() =>
    Object.fromEntries(INCLUDE_GROUPS.map((g) => [g.id, true])) as Record<IncludeId, boolean>
  )

  React.useEffect(() => {
    if (!open) return
    setCountryTick({})
    setSources({ website: true, offline: true, fundraiser: true })
    setInclude(Object.fromEntries(INCLUDE_GROUPS.map((g) => [g.id, true])) as Record<IncludeId, boolean>)
    setRange(undefined)
  }, [open])

  const selectedCountryIds = React.useMemo(
    () => Object.entries(countryTick).filter(([, v]) => v).map(([id]) => id),
    [countryTick]
  )

  const toggleCountry = (id: string, checked: boolean) => {
    setCountryTick((prev) => ({ ...prev, [id]: checked }))
  }

  const handleExport = async () => {
    if (!range?.from || !range?.to) {
      toast.error("Pick a date range")
      return
    }

    const sourcesOn = SOURCE_OPTIONS.filter((s) => sources[s.id]).map((s) => s.id)
    if (sourcesOn.length === 0) {
      toast.error("Select at least one source")
      return
    }

    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      params.set("from", range.from.toISOString())
      params.set("to", range.to.toISOString())

      if (selectedCountryIds.length > 0) {
        params.set("countryIds", selectedCountryIds.join(","))
      }

      if (sourcesOn.length < SOURCE_OPTIONS.length) {
        params.set("sources", sourcesOn.join(","))
      }

      const includeOn = INCLUDE_GROUPS.filter((g) => include[g.id]).map((g) => g.id)
      params.set("include", includeOn.join(","))

      const res = await fetch(`/api/admin/qurbani/export?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(typeof err?.error === "string" ? err.error : "Export failed")
      }

      const blob = await res.blob()
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="?([^";\n]+)"?/)?.[1] ??
        "qurbani-export.csv"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      toast.success("Export downloaded")
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Export qurbani donations</DialogTitle>
          <DialogDescription>
            Choose date range, optional filters, and which columns to include. Core fields (date, country, size,
            amount, type, source, donation ref) are always included.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">
            <div className="space-y-2">
              <Label>Date range</Label>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !range?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
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
                    <Button variant="outline" size="sm" onClick={() => setRange(undefined)}>
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setPopoverOpen(false)}
                      disabled={!range?.from || !range?.to}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label className="text-base">Countries</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave all unchecked to include every country. Tick specific countries to narrow the export.
                </p>
              </div>
              <div className="grid gap-2 max-h-32 overflow-y-auto rounded-md border p-3">
                {countries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No countries configured.</p>
                ) : (
                  countries.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={!!countryTick[c.id]}
                        onCheckedChange={(v) => toggleCountry(c.id, v === true)}
                      />
                      <span>{c.country}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base">Source</Label>
              <p className="text-xs text-muted-foreground">Include donations from these channels.</p>
              <div className="space-y-2">
                {SOURCE_OPTIONS.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={sources[s.id]}
                      onCheckedChange={(v) => setSources((prev) => ({ ...prev, [s.id]: v === true }))}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base">Columns to include</Label>
              <p className="text-xs text-muted-foreground">Uncheck sections you do not need in the CSV.</p>
              <div className="space-y-2">
                {INCLUDE_GROUPS.map((g) => (
                  <label key={g.id} className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox
                      className="mt-0.5"
                      checked={include[g.id]}
                      onCheckedChange={(v) => setInclude((prev) => ({ ...prev, [g.id]: v === true }))}
                    />
                    <span>{g.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!range?.from || !range?.to || isExporting}>
            {isExporting ? (
              "Exporting…"
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function QurbaniExportButton({
  countries,
  variant = "outline",
  size = "default",
  className,
}: {
  countries: { id: string; country: string }[]
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        Export
      </Button>
      <QurbaniExportModal open={open} onOpenChange={setOpen} countries={countries} />
    </>
  )
}
