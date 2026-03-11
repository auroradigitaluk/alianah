"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import { formatCurrency, formatCurrencyWhole, formatDate } from "@/lib/utils"

export const description = "An interactive area chart"

const chartConfig = {
  visitors: {
    label: "Donations",
  },
  total: {
    label: "Donations",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  data: {
    date: string
    desktop: number
    mobile: number
  }[]
  title?: string
  description?: string
  /** Label for the selected period (e.g. "Last 30 days") – data is already filtered by dashboard date range */
  periodLabel?: string
}

export function ChartAreaInteractive({
  data,
  title = "Donations Over Time",
  description = "Total donations for each day",
  periodLabel,
}: ChartAreaInteractiveProps) {
  // Data is already for the dashboard's selected date range; combine desktop + mobile into total
  const chartData = data.map((item) => ({
    ...item,
    total: item.desktop + item.mobile,
  }))

  return (
    <Card className="pt-0 overflow-hidden">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row min-w-0">
        <div className="grid flex-1 gap-1 min-w-0">
          <CardTitle className="truncate">{title}</CardTitle>
          <CardDescription className="truncate">
            {periodLabel ? `${description} (${periodLabel})` : description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 overflow-hidden min-w-0">
        <ChartContainer
          id="donations-over-time"
          config={chartConfig}
          className="aspect-auto h-[250px] w-full min-w-0"
        >
          <AreaChart data={chartData} margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-total)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-total)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => formatDate(value)}
            />
            <YAxis
              domain={[0, "auto"]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={(value) => formatCurrencyWhole(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDate(value)}
                  formatter={(value) => formatCurrency(value as number)}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="total"
              type="natural"
              fill="url(#fillTotal)"
              stroke="var(--color-total)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
