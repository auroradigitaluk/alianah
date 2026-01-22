"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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
  count: {
    label: "Count",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface ChartBarSimpleProps {
  data: {
    day: string
    count: number
  }[]
  title?: string
  description?: string
}

export function ChartBarSimple({
  data,
  title = "Total Subscribers",
  description,
}: ChartBarSimpleProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  const lastValue = data[data.length - 1]?.count || 0
  const previousValue = data[data.length - 2]?.count || 0
  const change = previousValue
    ? ((lastValue - previousValue) / previousValue) * 100
    : 0
  const changeAmount = lastValue - previousValue

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold">{total.toLocaleString()}</span>
                <span
                  className={`text-sm ${change >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
              </div>
              {description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {change >= 0 ? "+" : ""}
                  {changeAmount.toLocaleString()} from last period
                </div>
              )}
            </CardDescription>
          </div>
          <Select defaultValue="weekly">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
