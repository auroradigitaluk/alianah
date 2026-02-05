"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"

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

export const description = "Donations by payment method bar chart"

interface ChartPieSimpleProps {
  data: {
    name: string
    value: number
    label: string
  }[]
}

const chartConfig = {
  amount: {
    label: "Amount",
  },
  website: {
    label: "Website - Stripe",
    color: "oklch(0.574 0.259 142.38)",
  },
  offline_cash: {
    label: "Offline - Cash",
    color: "oklch(0.65 0.259 142.38)",
  },
  offline_bank: {
    label: "Offline - Bank Transfer",
    color: "oklch(0.72 0.259 142.38)",
  },
  collections: {
    label: "Collections (Masjid)",
    color: "oklch(0.8 0.259 142.38)",
  },
  water_sponsor: {
    label: "Water & Sponsor",
    color: "oklch(0.65 0.2 200)",
  },
  // Legacy support
  online: {
    label: "Website - Stripe",
    color: "oklch(0.574 0.259 142.38)",
  },
  card: {
    label: "Card",
    color: "oklch(0.65 0.259 142.38)",
  },
  cash: {
    label: "Offline - Cash",
    color: "oklch(0.72 0.259 142.38)",
  },
} satisfies ChartConfig

export function ChartPieSimple({ data }: ChartPieSimpleProps) {
  // Transform data for bar chart
  const chartData = data.map((item) => {
    const configKey = item.name.toLowerCase() as keyof typeof chartConfig
    const config = chartConfig[configKey]
    const color = (config && "color" in config ? config.color : undefined) || "oklch(0.574 0.259 142.38)"
    return {
      name: item.label || item.name,
      amount: item.value,
      fill: color,
    }
  })

  return (
    <Card className="flex flex-col h-full w-full overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base font-semibold">Donations by Payment Method</CardTitle>
        <CardDescription className="text-xs mt-1">Total donations breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 pt-0 flex items-center justify-center">
        <ChartContainer
          id="payment-methods-bar"
          config={chartConfig}
          className="aspect-video w-full min-h-[200px] mx-auto"
        >
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => (
                    <span className="font-bold">{formatCurrency(value as number)}</span>
                  )}
                />
              }
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
