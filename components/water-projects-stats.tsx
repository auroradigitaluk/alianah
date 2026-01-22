"use client"

import { Card } from "@/components/ui/card"
import { IconTrendingUp, IconCheck } from "@tabler/icons-react"

interface WaterProjectStats {
  totalProjects: number
  totalDonations: number
  totalAmount: number
  completedDonations: number
  ongoingDonations: number
  activeProjects: number
}

export function WaterProjectsStats({ stats }: { stats: WaterProjectStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Donations</p>
            <p className="text-2xl font-bold">{stats.totalDonations}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.ongoingDonations} ongoing, {stats.completedDonations} complete
            </p>
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            <IconTrendingUp className="h-6 w-6 text-primary" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold">£{(stats.totalAmount / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">This year ({new Date().getFullYear()})</p>
          </div>
          <div className="rounded-full bg-purple-500/10 p-3">
            <IconTrendingUp className="h-6 w-6 text-purple-500" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
            <p className="text-2xl font-bold">{stats.activeProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalProjects - stats.activeProjects} inactive
            </p>
          </div>
          <div className="rounded-full bg-orange-500/10 p-3">
            <IconCheck className="h-6 w-6 text-orange-500" />
          </div>
        </div>
      </Card>
    </div>
  )
}
