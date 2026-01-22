"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCurrency, formatDate } from "@/lib/utils"

const chartConfig = {
  amount: {
    label: "Donations",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface ChartLineUsersProps {
  data: {
    date: string
    amount: number
  }[]
}

export function ChartLineUsers({ data }: ChartLineUsersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Donations Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer id="donations-over-time" config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-amount)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-amount)"
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
              interval={4}
              tickFormatter={(value) => {
                const date = new Date(value)
                return formatDate(date)
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return formatDate(new Date(value))
                  }}
                  formatter={(value) => formatCurrency(value as number)}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="amount"
              type="natural"
              fill="url(#fillAmount)"
              stroke="var(--color-amount)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
