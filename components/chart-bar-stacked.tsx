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
import { formatCurrency } from "@/lib/utils"

const chartConfig = {
  online: {
    label: "Online",
    color: "var(--primary)",
  },
  offline: {
    label: "Offline",
    color: "var(--chart-2)",
  },
  collections: {
    label: "Collections",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface ChartBarStackedProps {
  data: {
    month: string
    online: number
    offline: number
    collections: number
  }[]
}

export function ChartBarStacked({ data }: ChartBarStackedProps) {
  const total = data.reduce(
    (sum, item) => sum + item.online + item.offline + item.collections,
    0
  )

  const lastMonth = data[data.length - 1]
  const previousMonth = data[data.length - 2]
  const lastTotal =
    lastMonth.online + lastMonth.offline + lastMonth.collections
  const previousTotal =
    previousMonth.online + previousMonth.offline + previousMonth.collections
  const change = ((lastTotal - previousTotal) / previousTotal) * 100
  const changeAmount = lastTotal - previousTotal

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Overview</CardTitle>
        <CardDescription>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {formatCurrency(Math.round(total * 100))}
            </span>
            <span
              className={`text-sm ${change >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {change >= 0 ? "+" : ""}
            {formatCurrency(Math.round(changeAmount * 100))} from last period
          </div>
        </CardDescription>
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
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar
              dataKey="online"
              stackId="a"
              fill="var(--color-online)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="offline"
              stackId="a"
              fill="var(--color-offline)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="collections"
              stackId="a"
              fill="var(--color-collections)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
