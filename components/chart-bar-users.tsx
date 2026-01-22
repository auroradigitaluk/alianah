"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const chartConfig = {
  users: {
    label: "Total New Registered Users",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface ChartBarUsersProps {
  data: {
    month: string
    users: number
  }[]
}

export function ChartBarUsers({ data }: ChartBarUsersProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>New Donors</CardTitle>
          <Select defaultValue="6months">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6months">6 months</SelectItem>
              <SelectItem value="3months">3 months</SelectItem>
              <SelectItem value="1month">1 month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  const prevValue = data.prevUsers || 0
                  const change = prevValue ? ((data.users - prevValue) / prevValue) * 100 : 0
                  return (
                    <ChartTooltipContent>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">New Donors: {data.users * 100}</span>
                        <span className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(0)}% than last month
                        </span>
                      </div>
                    </ChartTooltipContent>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="users"
              fill="var(--color-users)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-primary" />
          <span className="text-sm text-muted-foreground">Total New Donors</span>
        </div>
      </CardContent>
    </Card>
  )
}
