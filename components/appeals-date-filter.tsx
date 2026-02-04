"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const dateRangeOptions = [
  { value: "all_time", label: "All time" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_year", label: "This year" },
  { value: "last_year", label: "Last year" },
  { value: "custom", label: "Custom range" },
]

// Calculate date range from range value
function calculateDateRange(range: string, start?: string | null, end?: string | null) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // Handle custom range
  if (range === "custom" && start && end) {
    startDate = new Date(start)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(end)
    endDate.setHours(23, 59, 59, 999)
    return { startDate, endDate }
  }

  switch (range) {
    case "all_time":
      startDate = new Date(0)
      endDate = new Date()
      break
    case "this_week": {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      startDate = new Date(now.getFullYear(), now.getMonth(), diff)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
      break
    }
    case "last_week": {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const lastMonday = new Date(now.getFullYear(), now.getMonth(), diff - 7)
      startDate = new Date(lastMonday)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(lastMonday)
      endDate.setDate(endDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
      break
    }
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case "90d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case "last_year":
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      break
    default:
      // Default to all time
      startDate = new Date(0)
      endDate = new Date()
  }

  return { startDate, endDate }
}

interface AppealsDateFilterProps {
  onDateRangeChange?: (range: { startDate: Date; endDate: Date } | null) => void
}

export function AppealsDateFilter({ onDateRangeChange }: AppealsDateFilterProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentRange, setCurrentRange] = React.useState("all_time")
  const [dateRange, setDateRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [isCustomOpen, setIsCustomOpen] = React.useState(false)

  // Avoid hydration mismatch by only reading searchParams after mount
  React.useEffect(() => {
    const range = searchParams.get("range") || "all_time"
    setCurrentRange(range)
    
    // Parse custom dates from URL if present
    const startParam = searchParams.get("start")
    const endParam = searchParams.get("end")
    if (range === "custom" && startParam && endParam) {
      setDateRange({
        from: new Date(startParam),
        to: new Date(endParam),
      })
    } else if (range !== "custom") {
      setDateRange({ from: undefined, to: undefined })
    }
  }, [searchParams])

  // Notify parent of date range changes when in modal mode
  React.useEffect(() => {
    if (onDateRangeChange) {
      const range = currentRange
      const startParam = searchParams.get("start")
      const endParam = searchParams.get("end")
      const { startDate, endDate } = calculateDateRange(range, startParam, endParam)
      onDateRangeChange({ startDate, endDate })
    }
  }, [currentRange, searchParams, onDateRangeChange])

  const handleRangeChange = (value: string) => {
    setCurrentRange(value)
    
    if (onDateRangeChange) {
      // Modal mode - calculate and notify parent
      if (value === "custom") {
        setIsCustomOpen(true)
        // Will be handled by applyCustomRange
      } else if (value === "all_time") {
        const { startDate, endDate } = calculateDateRange(value)
        onDateRangeChange({ startDate, endDate })
        setDateRange({ from: undefined, to: undefined })
      } else {
        const { startDate, endDate } = calculateDateRange(value)
        onDateRangeChange({ startDate, endDate })
        setDateRange({ from: undefined, to: undefined })
      }
    } else {
      // Page mode - update URL
      const params = new URLSearchParams(searchParams.toString())
      
      if (value === "all_time") {
        // Default value, remove from URL
        params.delete("range")
        params.delete("start")
        params.delete("end")
      } else if (value === "custom") {
        params.set("range", "custom")
        setIsCustomOpen(true)
      } else {
        params.set("range", value)
        params.delete("start")
        params.delete("end")
        setDateRange({ from: undefined, to: undefined })
      }
      
      router.push(`?${params.toString()}`, { scroll: false })
    }
  }

  const applyCustomRange = () => {
    if (dateRange.from && dateRange.to) {
      if (onDateRangeChange) {
        // Modal mode - notify parent
        const startDate = new Date(dateRange.from)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(dateRange.to)
        endDate.setHours(23, 59, 59, 999)
        onDateRangeChange({ startDate, endDate })
        setIsCustomOpen(false)
      } else {
        // Page mode - update URL
        const params = new URLSearchParams(searchParams.toString())
        params.set("range", "custom")
        params.set("start", dateRange.from.toISOString())
        params.set("end", dateRange.to.toISOString())
        router.push(`?${params.toString()}`, { scroll: false })
        setIsCustomOpen(false)
      }
    }
  }

  const clearCustomRange = () => {
    setDateRange({ from: undefined, to: undefined })
    if (onDateRangeChange) {
      // Modal mode - reset to default
      const { startDate, endDate } = calculateDateRange("all_time")
      onDateRangeChange({ startDate, endDate })
      setCurrentRange("all_time")
      setIsCustomOpen(false)
    } else {
      // Page mode - update URL
      const params = new URLSearchParams(searchParams.toString())
      params.delete("range")
      params.delete("start")
      params.delete("end")
      setCurrentRange("all_time")
      router.push(`?${params.toString()}`, { scroll: false })
      setIsCustomOpen(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {currentRange === "custom" && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange.from && !dateRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from && dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : dateRange.from ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - Select end date
                </>
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                if (range) {
                  setDateRange({ from: range.from, to: range.to })
                } else {
                  setDateRange({ from: undefined, to: undefined })
                }
              }}
            />
            <div className="flex items-center justify-end gap-2 p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCustomRange}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={applyCustomRange}
                disabled={!dateRange.from || !dateRange.to}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
      <Select value={currentRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-[180px]" suppressHydrationWarning>
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
  )
}
