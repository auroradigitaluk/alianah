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

interface MonthOption {
  value: string
  label: string
}

interface DashboardMonthFilterProps {
  availableMonths: MonthOption[]
}

export function DashboardMonthFilter({ availableMonths }: DashboardMonthFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  // Use first available month if current month has no data, otherwise use current month
  const fallbackMonth = availableMonths.length > 0 ? availableMonths[0].value : defaultMonth
  const currentMonth = searchParams.get("month") || fallbackMonth

  const handleMonthChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === fallbackMonth) {
      // Default value, remove from URL
      params.delete("month")
    } else {
      params.set("month", value)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // If no months available, show current month as default
  const monthOptions = availableMonths.length > 0 
    ? availableMonths 
    : [{ value: defaultMonth, label: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }) }]

  return (
    <Select value={currentMonth} onValueChange={handleMonthChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {monthOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
