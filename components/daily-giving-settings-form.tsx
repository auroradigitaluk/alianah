"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function DailyGivingSettingsForm() {
  const [ramadhanStartDate, setRamadhanStartDate] = React.useState("")
  const [ramadhanEndDate, setRamadhanEndDate] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [fetching, setFetching] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/admin/settings/daily-giving")
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setRamadhanStartDate(data.ramadhanStartDate ?? "")
          setRamadhanEndDate(data.ramadhanEndDate ?? "")
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load daily giving settings")
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

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
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to save")
      }
      toast.success("Daily giving dates saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily giving dates</CardTitle>
        <CardDescription>
          Set Ramadhan start and end dates. The final charge runs on the end date, then the subscription stops.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="ramadhanStartDate">Ramadhan start date</Label>
            <Input
              id="ramadhanStartDate"
              type="date"
              value={ramadhanStartDate}
              onChange={(e) => setRamadhanStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ramadhanEndDate">End of Ramadhan</Label>
            <Input
              id="ramadhanEndDate"
              type="date"
              value={ramadhanEndDate}
              onChange={(e) => setRamadhanEndDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The final charge runs on this day, then the subscription stops.
            </p>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save dates"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
