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

const chartConfig = {
  amount: {
    label: "Amount",
  },
  online: {
    label: "Online",
    color: "var(--primary)",
  },
  card: {
    label: "Card",
    color: "var(--primary)",
  },
  cash: {
    label: "Cash",
    color: "var(--primary)",
  },
} satisfies ChartConfig

interface ChartDonutPaymentMethodsProps {
  data: {
    name: string
    value: number
    label: string
  }[]
}

export function ChartDonutPaymentMethods({
  data,
}: ChartDonutPaymentMethodsProps) {
  // Transform data to match the expected format with fill colors
  const chartData = data.map((item) => ({
    paymentMethod: item.name,
    amount: item.value,
    fill: `var(--color-${item.name})`,
  }))

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const onlineAmount = data.find((item) => item.name === "online")?.value || 0
  const onlinePercentage = total > 0 ? ((onlineAmount / total) * 100).toFixed(1) : "0"

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Donations by Payment Method</CardTitle>
        <CardDescription>Total donations breakdown</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          id="payment-methods"
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie data={chartData} dataKey="amount" nameKey="paymentMethod" innerRadius={60} />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Online donations: {onlinePercentage}% <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing donation distribution by payment method
        </div>
      </CardFooter>
    </Card>
  )
}
