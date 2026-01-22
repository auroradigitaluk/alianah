"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconDroplet } from "@tabler/icons-react"
import { ExternalLink } from "lucide-react"
import { DetailModal } from "@/components/detail-modal"

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pump",
  WATER_WELL: "Water Well",
  WATER_TANK: "Water Tank",
  WUDHU_AREA: "Wudhu Area",
}

const STATUS_LABELS: Record<string, string> = {
  WAITING_TO_REVIEW: "To Review",
  ORDERED: "Ordered",
  PENDING: "Pending",
  COMPLETE: "Complete",
}

interface WaterProject {
  id: string
  projectType: string
  location: string | null
  description?: string | null
  isActive: boolean
  status: string | null
  amountPence: number
  donations?: Array<{
    id: string
    status: string | null
    country: {
      country: string
      pricePence: number
    }
    donor: {
      firstName: string
      lastName: string
      email: string
    }
    amountPence: number
  }>
  availableCountries?: Array<{
    id: string
    country: string
    pricePence: number
  }>
  completedAt?: Date | null
  createdAt: Date
}

export function WaterProjectsTable({ projects }: { projects: WaterProject[] }) {
  const [selectedProject, setSelectedProject] = useState<WaterProject | null>(null)

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      WAITING_TO_REVIEW: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
      ORDERED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      PENDING: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      COMPLETE: "bg-primary/10 text-primary dark:text-primary",
    }
    const statusLabels: Record<string, string> = {
      WAITING_TO_REVIEW: "To Review",
      ORDERED: "Ordered",
      PENDING: "Pending",
      COMPLETE: "Complete",
    }
    return (
      <Badge className={statusColors[status] || ""}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const totalDonated = (project: WaterProject) => {
    return project.donations?.reduce((sum, d) => sum + d.amountPence, 0) || 0
  }

  const getCountriesForProject = (project: WaterProject) => {
    // Use availableCountries if available, otherwise fall back to countries from donations
    if (project.availableCountries && project.availableCountries.length > 0) {
      return project.availableCountries.map(c => c.country)
    }
    const countries = new Set<string>()
    project.donations?.forEach(d => {
      if (d.country) {
        countries.add(d.country.country)
      }
    })
    return Array.from(countries)
  }

  return (
    <>
      <AdminTable
        data={projects}
        onRowClick={(project) => setSelectedProject(project)}
        columns={[
          {
            id: "projectType",
            header: "Type",
            cell: (project) => (
              <div className="flex items-center gap-2">
                <IconDroplet className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{PROJECT_TYPE_LABELS[project.projectType] || project.projectType}</span>
              </div>
            ),
          },
          {
            id: "countries",
            header: "Countries",
            cell: (project) => {
              const countries = getCountriesForProject(project)
              if (countries.length === 0) {
                return <span className="text-sm text-muted-foreground">No countries</span>
              }
              return (
                <div className="flex flex-wrap gap-1">
                  {countries.slice(0, 3).map((country, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {country}
                    </Badge>
                  ))}
                  {countries.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{countries.length - 3}
                    </Badge>
                  )}
                </div>
              )
            },
          },
          {
            id: "ongoing",
            header: "Ongoing",
            cell: (project) => {
              const ongoingStatuses = ["WAITING_TO_REVIEW", "ORDERED", "PENDING"]
              const ongoingCount = project.donations?.filter(d => {
                const status = (d as any).status
                return status && ongoingStatuses.includes(status)
              }).length || 0
              return (
                <div className="text-sm font-medium text-orange-700 dark:text-orange-400 text-center">
                  {ongoingCount}
                </div>
              )
            },
          },
          {
            id: "completed",
            header: "Complete",
            cell: (project) => {
              const completedCount = project.donations?.filter(d => {
                const status = (d as any).status
                return status === "COMPLETE"
              }).length || 0
              return (
                <div className="text-sm font-medium text-primary text-center">
                  {completedCount}
                </div>
              )
            },
          },
          {
            id: "totalDonations",
            header: "Total",
            cell: (project) => {
              const donationCount = project.donations?.length || 0
              return (
                <div className="text-sm font-medium text-center">
                  {donationCount}
                </div>
              )
            },
          },
          {
            id: "donations",
            header: "Total Amount",
            cell: (project) => {
              const donated = totalDonated(project)
              return (
                <div className="text-sm font-medium">
                  £{(donated / 100).toFixed(2)}
                </div>
              )
            },
          },
          {
            id: "actions",
            header: "Actions",
            cell: (project) => (
              <Link
                href={`/admin/water-projects/${project.id}/edit`}
                className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            ),
          },
        ]}
        enableSelection={false}
      />
      <DetailModal
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        title={selectedProject ? `${PROJECT_TYPE_LABELS[selectedProject.projectType]}` : "Project Details"}
      >
        {selectedProject && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</h3>
              <p className="text-base font-semibold">{PROJECT_TYPE_LABELS[selectedProject.projectType]}</p>
            </div>
            {selectedProject.donations && selectedProject.donations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Countries</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(selectedProject.donations.map(d => d.country?.country).filter(Boolean))).map((country, idx) => (
                    <Badge key={idx} variant="outline">
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedProject.description && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</h3>
                <p className="text-base">{selectedProject.description}</p>
              </div>
            )}
            {selectedProject.status && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h3>
                {getStatusBadge(selectedProject.status)}
              </div>
            )}
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Status</h3>
              <Badge className={selectedProject.isActive ? "bg-primary/10 text-primary dark:text-primary" : "bg-gray-500/10 text-gray-700 dark:text-gray-400"}>
                {selectedProject.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {selectedProject.donations && selectedProject.donations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donations Summary</h3>
                  <Link
                    href={`/admin/water-projects/${
                      selectedProject.projectType === "WATER_PUMP" ? "pumps" :
                      selectedProject.projectType === "WATER_WELL" ? "wells" :
                      selectedProject.projectType === "WATER_TANK" ? "tanks" :
                      "wudhu"
                    }`}
                    className="text-xs text-primary hover:underline"
                  >
                    Manage Donations →
                  </Link>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{selectedProject.donations.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ongoing</p>
                      <p className="text-lg font-bold text-orange-600">
                        {selectedProject.donations.filter(d => {
                          const status = (d as any).status
                          return status && ["WAITING_TO_REVIEW", "ORDERED", "PENDING"].includes(status)
                        }).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Complete</p>
                      <p className="text-lg font-bold text-primary">
                        {selectedProject.donations.filter(d => (d as any).status === "COMPLETE").length}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Total Amount</p>
                    <p className="text-2xl font-bold">
                      £{(selectedProject.donations.reduce((sum, d) => sum + d.amountPence, 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {selectedProject.completedAt && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed At</h3>
                <p className="text-base">{new Date(selectedProject.completedAt).toLocaleDateString()}</p>
              </div>
            )}
            <div className="pt-2 border-t flex flex-col gap-2">
              <Link
                href={`/admin/water-projects/${
                  selectedProject.projectType === "WATER_PUMP" ? "pumps" :
                  selectedProject.projectType === "WATER_WELL" ? "wells" :
                  selectedProject.projectType === "WATER_TANK" ? "tanks" :
                  "wudhu"
                }`}
                className="text-sm text-primary hover:underline"
              >
                Manage Donations →
              </Link>
              <Link
                href={`/admin/water-projects/${selectedProject.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                Edit Project Settings →
              </Link>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
