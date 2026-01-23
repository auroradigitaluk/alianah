"use client"

import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

export const description = "A simple pie chart"

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
  // Transform data to match expected format
  const chartData = data.map((item) => {
    const configKey = item.name.toLowerCase() as keyof typeof chartConfig
    const config = chartConfig[configKey]
    const color = (config && 'color' in config ? config.color : undefined) || "oklch(0.574 0.259 142.38)"
    return {
      paymentMethod: item.name,
      amount: item.value,
      fill: color,
    }
  })

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const onlineAmount = data.find((item) => item.name === "online")?.value || 0
  const onlinePercentage = total > 0 ? ((onlineAmount / total) * 100).toFixed(1) : "0"

  return (
    <Card className="flex flex-col h-full w-full overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base font-semibold">Donations by Payment Method</CardTitle>
        <CardDescription className="text-xs mt-1">Total donations breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-4 pt-0 flex items-center justify-center">
        <ChartContainer
          id="payment-methods-pie"
          config={chartConfig}
          className="aspect-square w-full max-w-[280px] mx-auto"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => {
                    // name is the paymentMethod value (online, card, cash)
                    const dataItem = data.find((item) => item.name === name)
                    const label = dataItem?.label || name || "Unknown"
                    return (
                      <span className="font-bold">
                        {label} {formatCurrency(value as number)}
                      </span>
                    )
                  }}
                />
              }
            />
            <Pie data={chartData} dataKey="amount" nameKey="paymentMethod" />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
