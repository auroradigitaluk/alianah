"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const dateRangeOptions = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "30d", label: "Last 30 days" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
]

function formatCustomLabel(start: string, end: string): string {
  try {
    const from = new Date(start + "T00:00:00")
    const to = new Date(end + "T00:00:00")
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Custom range"
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    return `${fmt(from)} – ${fmt(to)}`
  } catch {
    return "Custom range"
  }
}

const DashboardDateContext = React.createContext<{ onBeforeNavigate?: () => void }>({})

export function useDashboardDateContext() {
  return React.useContext(DashboardDateContext)
}

export function DashboardDateWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const [isChanging, setIsChanging] = React.useState(false)

  React.useEffect(() => {
    setIsChanging(false)
  }, [searchParams])

  const value = React.useMemo(
    () => ({ onBeforeNavigate: () => setIsChanging(true) }),
    []
  )

  if (isChanging) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-9 w-48" />
                  <Skeleton className="h-9 w-28" />
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-20" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-80 w-full" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-64" />
                  <Skeleton className="h-64" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardDateContext.Provider value={value}>
      {children}
    </DashboardDateContext.Provider>
  )
}

export function DashboardDateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateContext = useDashboardDateContext()
  const [mounted, setMounted] = React.useState(false)
  const [currentRange, setCurrentRange] = React.useState("30d")
  const [customPopoverOpen, setCustomPopoverOpen] = React.useState(false)
  const [customStart, setCustomStart] = React.useState("")
  const [customEnd, setCustomEnd] = React.useState("")

  const startParam = searchParams.get("start")
  const endParam = searchParams.get("end")

  React.useEffect(() => {
    setMounted(true)
    const range = searchParams.get("range") || "30d"
    setCurrentRange(range)
    if (searchParams.get("start")) setCustomStart(searchParams.get("start") ?? "")
    if (searchParams.get("end")) setCustomEnd(searchParams.get("end") ?? "")
  }, [searchParams])

  const handleRangeChange = (value: string) => {
    setCurrentRange(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === "30d") {
      params.delete("range")
      params.delete("start")
      params.delete("end")
    } else {
      params.set("range", value)
      if (value !== "custom") {
        params.delete("start")
        params.delete("end")
      } else {
        if (!params.get("start") || !params.get("end")) {
          const today = new Date()
          const end = today.toISOString().slice(0, 10)
          const start = new Date(today)
          start.setDate(start.getDate() - 30)
          const startStr = start.toISOString().slice(0, 10)
          params.set("start", startStr)
          params.set("end", end)
          setCustomStart(startStr)
          setCustomEnd(end)
        }
        setCustomPopoverOpen(true)
      }
    }
    if (value !== "custom") {
      dateContext.onBeforeNavigate?.()
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return
    const start = new Date(customStart + "T00:00:00")
    const end = new Date(customEnd + "T23:59:59.999")
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return
    dateContext.onBeforeNavigate?.()
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", "custom")
    params.set("start", customStart)
    params.set("end", customEnd)
    router.push(`?${params.toString()}`, { scroll: false })
    setCustomPopoverOpen(false)
  }

  const customRangeLabel =
    mounted && currentRange === "custom" && startParam && endParam
      ? formatCustomLabel(startParam, endParam)
      : null

  const [mobilePopoverOpen, setMobilePopoverOpen] = React.useState(false)

  const renderCustomForm = (onAfterApply?: () => void) => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="custom-start">From</Label>
        <Input
          id="custom-start"
          type="date"
          value={customStart || startParam || ""}
          onChange={(e) => setCustomStart(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="custom-end">To</Label>
        <Input
          id="custom-end"
          type="date"
          value={customEnd || endParam || ""}
          onChange={(e) => setCustomEnd(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        onClick={() => {
          applyCustomRange()
          onAfterApply?.()
        }}
      >
        Apply
      </Button>
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      {/* Mobile: icon button that opens popover with date options */}
      <Popover open={mobilePopoverOpen} onOpenChange={setMobilePopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-primary hover:text-primary-foreground sm:hidden"
            aria-label="Date range"
          >
            <Calendar className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="end">
          <div className="p-1">
            {dateRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={currentRange === option.value ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  handleRangeChange(option.value)
                  if (option.value !== "custom") setMobilePopoverOpen(false)
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {currentRange === "custom" && (
            <div className="border-t p-3">
              {renderCustomForm(() => setMobilePopoverOpen(false))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Desktop: full select */}
      <div className="hidden sm:flex items-center gap-2">
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
        {currentRange === "custom" && (
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 min-w-0">
                {customRangeLabel ?? "Pick dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              {renderCustomForm()}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}
