"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const dateRangeOptions = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
]

const calculateDateRange = (range: string, start?: string, end?: string) => {
  const now = new Date()
  let startDate: Date | null = null
  let endDate: Date | null = null

  switch (range) {
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case "90d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case "last_year":
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      break
    case "custom":
      if (start && end) {
        startDate = new Date(start)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(end)
        endDate.setHours(23, 59, 59, 999)
      }
      break
    case "all":
      startDate = null
      endDate = null
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  return { startDate, endDate }
}

export function ReportsDateFilter({
  onRangeChange,
}: {
  onRangeChange: (range: { startDate: Date | null; endDate: Date | null }) => void
}) {
  const [currentRange, setCurrentRange] = React.useState("this_month")
  const [customStart, setCustomStart] = React.useState("")
  const [customEnd, setCustomEnd] = React.useState("")
  const lastSentRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (currentRange === "custom" && (!customStart || !customEnd)) {
      return
    }
    const { startDate, endDate } = calculateDateRange(currentRange, customStart, customEnd)
    const nextKey = `${startDate?.toISOString() || "null"}|${endDate?.toISOString() || "null"}`
    if (lastSentRef.current === nextKey) {
      return
    }
    lastSentRef.current = nextKey
    onRangeChange({ startDate, endDate })
  }, [currentRange, customStart, customEnd, onRangeChange])

  const applyCustom = () => {
    if (customStart && customEnd) {
      setCurrentRange("custom")
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <Label className="text-xs text-muted-foreground mb-1.5 block">Date range</Label>
        <Select value={currentRange} onValueChange={setCurrentRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currentRange === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customStart}
            onChange={(event) => setCustomStart(event.target.value)}
          />
          <Input
            type="date"
            value={customEnd}
            onChange={(event) => setCustomEnd(event.target.value)}
          />
          <Button variant="outline" onClick={applyCustom} disabled={!customStart || !customEnd}>
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}
