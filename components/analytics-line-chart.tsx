"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type AnalyticsSeriesPoint = {
  date: string
  pageviews: number
  visitors: number
  sessions: number
}

const chartConfig = {
  pageviews: {
    label: "Pageviews",
    color: "var(--primary)",
  },
  visitors: {
    label: "Visitors",
    color: "hsl(var(--chart-2))",
  },
  sessions: {
    label: "Sessions",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export function AnalyticsLineChart({ data }: { data: AnalyticsSeriesPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer id="analytics-trends" config={chartConfig} className="h-[320px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillPageviews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-pageviews)" stopOpacity={0.9} />
                <stop offset="95%" stopColor="var(--color-pageviews)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sessions)" stopOpacity={0.6} />
                <stop offset="95%" stopColor="var(--color-sessions)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => value as string}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="pageviews"
              type="natural"
              fill="url(#fillPageviews)"
              stroke="var(--color-pageviews)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="visitors"
              type="natural"
              fill="url(#fillVisitors)"
              stroke="var(--color-visitors)"
              strokeWidth={2}
            />
            <Area
              dataKey="sessions"
              type="natural"
              fill="url(#fillSessions)"
              stroke="var(--color-sessions)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
