"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar, Gift } from "lucide-react"
import { toast } from "sonner"

export type AppealOption = { id: string; title: string }

type DailyGivingSetupModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  appeals: AppealOption[]
  onSaved?: () => void
}

export function DailyGivingSetupModal({
  open,
  onOpenChange,
  appeals,
  onSaved,
}: DailyGivingSetupModalProps) {
  const [ramadhanStartDate, setRamadhanStartDate] = React.useState("")
  const [ramadhanEndDate, setRamadhanEndDate] = React.useState("")
  const [selectedAppealIds, setSelectedAppealIds] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [fetching, setFetching] = React.useState(false)

  const fetchSettings = React.useCallback(async () => {
    setFetching(true)
    try {
      const res = await fetch("/api/admin/settings/daily-giving")
      if (!res.ok) return
      const data = await res.json()
      setRamadhanStartDate(data.ramadhanStartDate ?? "")
      setRamadhanEndDate(data.ramadhanEndDate ?? "")
      setSelectedAppealIds(Array.isArray(data.dailyGivingAppealIds) ? data.dailyGivingAppealIds : [])
    } catch {
      toast.error("Failed to load daily giving settings")
    } finally {
      setFetching(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) fetchSettings()
  }, [open, fetchSettings])

  const toggleAppeal = (id: string) => {
    setSelectedAppealIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings/daily-giving", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ramadhanStartDate: ramadhanStartDate || null,
          ramadhanEndDate: ramadhanEndDate || null,
          dailyGivingAppealIds: selectedAppealIds.slice(0, 4),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to save")
      }
      toast.success("Daily giving setup saved")
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Daily giving setup</DialogTitle>
          <DialogDescription>
            Set Ramadhan dates and choose which appeals appear on the public Daily Giving page (max 4). The final charge runs on the end date, then the subscription stops.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {fetching ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </div>
                  <div className="rounded-lg border border-border/60 px-4 py-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="modal-ramadhanStartDate">Ramadhan start date</Label>
                      <Input
                        id="modal-ramadhanStartDate"
                        type="date"
                        value={ramadhanStartDate}
                        onChange={(e) => setRamadhanStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-ramadhanEndDate">End of Ramadhan</Label>
                      <Input
                        id="modal-ramadhanEndDate"
                        type="date"
                        value={ramadhanEndDate}
                        onChange={(e) => setRamadhanEndDate(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        The final charge runs on this day, then the subscription stops (e.g. 20 March 2026).
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    <Gift className="h-4 w-4" />
                    Appeals to show (max 4)
                  </div>
                  <div className="rounded-lg border border-border/60 px-4 py-4">
                    {appeals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active appeals. Create or activate appeals first.</p>
                    ) : (
                      <ul className="space-y-2">
                        {appeals.map((appeal) => (
                          <li key={appeal.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`appeal-${appeal.id}`}
                              checked={selectedAppealIds.includes(appeal.id)}
                              disabled={!selectedAppealIds.includes(appeal.id) && selectedAppealIds.length >= 4}
                              onChange={() => toggleAppeal(appeal.id)}
                              className="h-4 w-4 rounded border-input"
                            />
                            <Label htmlFor={`appeal-${appeal.id}`} className="font-normal cursor-pointer flex-1">
                              {appeal.title}
                            </Label>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedAppealIds.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-3">
                        {selectedAppealIds.length} of 4 selected. These appeals will appear on the public Daily Giving page.
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          {!fetching && (
            <div className="px-6 py-4 border-t flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save setup"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
