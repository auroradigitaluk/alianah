"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type AnalyticsRangeValue =
  | "last_7"
  | "last_30"
  | "this_week"
  | "this_month"
  | "this_year"
  | "custom"

export type AnalyticsIntervalValue = "day" | "week" | "month" | "year"

export type AnalyticsRangeSelection = {
  range: AnalyticsRangeValue
  interval: AnalyticsIntervalValue
  from?: Date
  to?: Date
}

const rangeOptions = [
  { value: "last_7", label: "Last 7 days" },
  { value: "last_30", label: "Last 30 days" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
] as const

const intervalOptions = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
] as const

export function AnalyticsRangeFilter({
  value,
  onChange,
}: {
  value: AnalyticsRangeSelection
  onChange: (next: AnalyticsRangeSelection) => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [range, setRange] = React.useState<DateRange | undefined>(
    value.from ? { from: value.from, to: value.to } : undefined
  )

  React.useEffect(() => {
    setRange(value.from ? { from: value.from, to: value.to } : undefined)
  }, [value.from, value.to])

  const applyCustom = () => {
    if (range?.from && range?.to) {
      onChange({
        ...value,
        range: "custom",
        from: range.from,
        to: range.to,
      })
      setIsOpen(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={value.range}
        onValueChange={(next) => {
          if (next === "custom") {
            setIsOpen(true)
            onChange({ ...value, range: "custom" })
          } else {
            onChange({ ...value, range: next as AnalyticsRangeValue, from: undefined, to: undefined })
          }
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {rangeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.interval}
        onValueChange={(next) =>
          onChange({ ...value, interval: next as AnalyticsIntervalValue })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Interval" />
        </SelectTrigger>
        <SelectContent>
          {intervalOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !value.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value.from && value.to ? (
              <>
                {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
              </>
            ) : (
              <span>Pick custom range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={(selected) => {
              setRange(selected ?? undefined)
            }}
          />
          <div className="flex items-center justify-end gap-2 p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRange(undefined)
                onChange({ ...value, range: "custom", from: undefined, to: undefined })
              }}
            >
              Clear
            </Button>
            <Button size="sm" onClick={applyCustom} disabled={!range?.from || !range?.to}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
