"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { PoundSterling, Users, LayoutList, Heart } from "lucide-react"

export interface FundraiserStats {
  totalRaisedPence: number
  activeFundraisers: number
  totalFundraisers: number
  donationsThroughFundraisers: number
}

const CARD_STYLES = [
  "from-primary/10 via-primary/5 to-card border-primary/20 bg-primary/5",
  "from-blue-500/10 via-blue-500/5 to-card border-blue-500/20 bg-blue-500/5",
  "from-cyan-500/10 via-cyan-500/5 to-card border-cyan-500/20 bg-cyan-500/5",
  "from-purple-500/10 via-purple-500/5 to-card border-purple-500/20 bg-purple-500/5",
] as const

const ICON_STYLES = [
  "bg-primary/10 text-primary",
  "bg-blue-500/10 text-blue-600",
  "bg-cyan-500/10 text-cyan-600",
  "bg-purple-500/10 text-purple-600",
] as const

const BLUR_STYLES = [
  "bg-primary/5",
  "bg-blue-500/5",
  "bg-cyan-500/5",
  "bg-purple-500/5",
] as const

export function FundraisersDashboardKpis({ stats }: { stats: FundraiserStats }) {
  const cards = [
    {
      label: "Total raised via fundraisers",
      value: formatCurrency(stats.totalRaisedPence),
      icon: PoundSterling,
    },
    {
      label: "Active fundraisers",
      value: String(stats.activeFundraisers),
      icon: Users,
    },
    {
      label: "Total fundraisers",
      value: String(stats.totalFundraisers),
      icon: LayoutList,
    },
    {
      label: "Donations through fundraisers",
      value: String(stats.donationsThroughFundraisers),
      icon: Heart,
    },
  ]

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }, i) => (
        <Card
          key={label}
          className={`relative overflow-hidden bg-gradient-to-br ${CARD_STYLES[i]} border shadow-sm hover:shadow-md transition-shadow duration-200`}
        >
          <div
            className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 ${BLUR_STYLES[i]}`}
          />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <div className={`rounded-lg p-2 ${ICON_STYLES[i]}`}>
              <Icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
