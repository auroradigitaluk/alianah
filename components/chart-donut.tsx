"use client"

import * as React from "react"
import { Cell, Pie, PieChart } from "recharts"

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
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"

const chartConfig = {
  website: {
    label: "Website",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile App",
    color: "var(--chart-2)",
  },
  other: {
    label: "Other",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface ChartDonutProps {
  data: {
    name: string
    value: number
    label: string
  }[]
  title?: string
}

export function ChartDonut({
  data,
  title = "Income Distribution",
}: ChartDonutProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Select defaultValue="monthly">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[300px] w-full">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  const percentage = ((data.value / total) * 100).toFixed(1)
                  return (
                    <ChartTooltipContent>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{data.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {formatCurrency(Math.round(data.value * 100))}
                          </span>
                          <span className="text-muted-foreground">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    </ChartTooltipContent>
                  )
                }
                return null
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              strokeWidth={5}
            >
              {data.map((item, index) => {
                const configKey = item.name.toLowerCase().replace(/\s+/g, "")
                const config = chartConfig[configKey as keyof typeof chartConfig]
                const color = config?.color || `var(--chart-${(index % 5) + 1})`
                return <Cell key={`cell-${index}`} fill={color} />
              })}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="label" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1)
            const configKey = item.name.toLowerCase().replace(/\s+/g, "")
            const config = chartConfig[configKey as keyof typeof chartConfig]
            const color = config?.color || `var(--chart-${(index % 5) + 1})`
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {formatCurrency(Math.round(item.value * 100))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({percentage}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
