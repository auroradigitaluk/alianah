"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconDroplet, IconTrendingUp, IconCheck, IconClock, IconMapPin } from "@tabler/icons-react"

interface ProjectAnalytics {
  projectType: string
  totalDonations: number
  totalAmount: number
  completedCount: number
  ongoingCount: number
  countries: string[]
  averageAmount: number
}

interface WaterProjectsAnalyticsProps {
  analytics: ProjectAnalytics[]
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pump",
  WATER_WELL: "Water Well",
  WATER_TANK: "Water Tank",
  WUDHU_AREA: "Wudhu Area",
}

export function WaterProjectsAnalytics({ analytics }: WaterProjectsAnalyticsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Project Analytics</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {analytics.map((project) => (
          <Card key={project.projectType} className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconDroplet className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold">{PROJECT_TYPE_LABELS[project.projectType] || project.projectType}</h4>
                </div>
                <Badge variant="outline" className="px-2">
                  {project.totalDonations} donations
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">£{(project.totalAmount / 100).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Average</p>
                  <p className="text-lg font-bold">£{(project.averageAmount / 100).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Ongoing</p>
                  <p className="text-lg font-bold text-orange-600">{project.ongoingCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Complete</p>
                  <p className="text-lg font-bold text-primary">{project.completedCount}</p>
                </div>
              </div>

              {project.countries.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <IconMapPin className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Countries</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {project.countries.slice(0, 5).map((country, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {country}
                      </Badge>
                    ))}
                    {project.countries.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.countries.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
