"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, DollarSign, Plus, Building2, XCircle, CheckCircle2 } from "lucide-react"

interface Activity {
  type: string
  message: string
  timestamp: Date
}

interface RecentActivityProps {
  activities: Activity[]
}

const ITEMS_PER_PAGE = 5

export function RecentActivity({ activities }: RecentActivityProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE)
  const startIndex = currentPage * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentActivities = activities.slice(startIndex, endIndex)

  const getActivityIcon = (type: string) => {
    if (type.includes("donation")) {
      return <DollarSign className="h-4 w-4 text-green-600" />
    }
    if (type.includes("fundraiser")) {
      return <Plus className="h-4 w-4 text-blue-600" />
    }
    if (type.includes("collection")) {
      return <Building2 className="h-4 w-4 text-purple-600" />
    }
    if (type.includes("cancelled")) {
      return <XCircle className="h-4 w-4 text-orange-600" />
    }
    if (type.includes("succeeded")) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }
    return <DollarSign className="h-4 w-4 text-muted-foreground" />
  }

  const formatTimeAgo = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="space-y-0 divide-y divide-border">
          {currentActivities.map((activity, index) => (
            <div
              key={`${activity.timestamp}-${index}`}
              className="flex items-start gap-3 px-1 py-3 first:pt-0 last:pb-0 hover:bg-muted/50 transition-colors rounded-md"
            >
              <div className="mt-0.5 flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTimeAgo(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, activities.length)} of {activities.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs text-muted-foreground min-w-[60px] text-center">
                Page {currentPage + 1} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
