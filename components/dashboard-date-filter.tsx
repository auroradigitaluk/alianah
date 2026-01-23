"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const dateRangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
]

export function DashboardDateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = React.useState(false)
  const [currentRange, setCurrentRange] = React.useState("30d")
  
  // Avoid hydration mismatch by only reading searchParams after mount
  React.useEffect(() => {
    setMounted(true)
    const range = searchParams.get("range") || "30d"
    setCurrentRange(range)
  }, [searchParams])

  const handleRangeChange = (value: string) => {
    setCurrentRange(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === "30d") {
      // Default value, remove from URL
      params.delete("range")
    } else {
      params.set("range", value)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
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
  )
}
