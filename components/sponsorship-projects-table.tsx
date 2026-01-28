"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconUsersGroup } from "@tabler/icons-react"
import { ExternalLink, Users, MapPin, FileText, Target, Calendar } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PROJECT_TYPE_LABELS: Record<string, string> = {
  ORPHANS: "Orphans",
  HIFZ: "Hifz",
  FAMILIES: "Families",
}

function donationsSlug(projectType: string) {
  return projectType.toLowerCase()
}

interface SponsorshipProject {
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
    country: { country: string; pricePence: number }
    donor: { firstName: string; lastName: string; email: string }
    amountPence: number
  }>
  availableCountries?: Array<{ id: string; country: string; pricePence: number }>
  completedAt?: Date | null
  createdAt: Date
}

export function SponsorshipProjectsTable({ projects }: { projects: SponsorshipProject[] }) {
  const [selectedProject, setSelectedProject] = useState<SponsorshipProject | null>(null)

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

  const totalDonated = (project: SponsorshipProject) =>
    project.donations?.reduce((sum, d) => sum + d.amountPence, 0) || 0

  const getCountriesForProject = (project: SponsorshipProject) => {
    if (project.availableCountries?.length) {
      return project.availableCountries.map((c) => c.country)
    }
    const countries = new Set<string>()
    project.donations?.forEach((d) => {
      if (d.country) countries.add(d.country.country)
    })
    return Array.from(countries)
  }

  return (
    <>
      <AdminTable
        data={projects}
        onRowClick={(p) => setSelectedProject(p)}
        columns={[
          {
            id: "projectType",
            header: "Type",
            cell: (p) => (
              <div className="flex items-center gap-2">
                <IconUsersGroup className="h-4 w-4 text-primary" />
                <span className="font-medium">{PROJECT_TYPE_LABELS[p.projectType] || p.projectType}</span>
              </div>
            ),
          },
          {
            id: "countries",
            header: "Countries",
            cell: (p) => {
              const countries = getCountriesForProject(p)
              if (!countries.length) return <span className="text-sm text-muted-foreground">No countries</span>
              return (
                <div className="flex flex-wrap gap-1">
                  {countries.slice(0, 3).map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                  {countries.length > 3 && (
                    <Badge variant="outline" className="text-xs">+{countries.length - 3}</Badge>
                  )}
                </div>
              )
            },
          },
          {
            id: "ongoing",
            header: "Ongoing",
            cell: (p) => {
              const ongoing = ["WAITING_TO_REVIEW", "ORDERED", "PENDING"]
              const n = p.donations?.filter((d: { status: string | null }) => d.status && ongoing.includes(d.status)).length ?? 0
              return <div className="text-sm font-medium text-orange-700 dark:text-orange-400 text-center">{n}</div>
            },
          },
          {
            id: "completed",
            header: "Complete",
            cell: (p) => {
              const n = p.donations?.filter((d: { status: string | null }) => d.status === "COMPLETE").length ?? 0
              return <div className="text-sm font-medium text-primary text-center">{n}</div>
            },
          },
          {
            id: "totalDonations",
            header: "Total",
            cell: (p) => (
              <div className="text-sm font-medium text-center">{p.donations?.length ?? 0}</div>
            ),
          },
          {
            id: "donations",
            header: "Total Amount",
            cell: (p) => (
              <div className="text-sm font-medium">£{(totalDonated(p) / 100).toFixed(2)}</div>
            ),
          },
          {
            id: "actions",
            header: "Actions",
            cell: (p) => (
              <Link
                href={`/sponsors/${
                  p.projectType === "ORPHANS"
                    ? "orphans"
                    : p.projectType === "HIFZ"
                    ? "hifz"
                    : "families"
                }`}
                target="_blank"
                rel="noopener noreferrer"
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
      <Dialog open={!!selectedProject} onOpenChange={(o) => !o && setSelectedProject(null)}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedProject ? PROJECT_TYPE_LABELS[selectedProject.projectType] : "Project Details"}
            </DialogTitle>
            <DialogDescription>
              Sponsorship project information and donation statistics
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {selectedProject.donations && selectedProject.donations.length > 0 && (
                      <TabsTrigger value="donations">
                        Donations ({selectedProject.donations.length})
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    {selectedProject.donations && selectedProject.donations.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                          <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0 relative z-10">
                            <div className="text-2xl font-bold text-primary">
                              £{(selectedProject.donations.reduce((s, d) => s + d.amountPence, 0) / 100).toFixed(2)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                          <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0 relative z-10">
                            <div className="text-2xl font-bold">{selectedProject.donations.length}</div>
                          </CardContent>
                        </Card>
                        <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-orange-500/5 via-card to-card border-orange-500/20">
                          <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Ongoing</CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0 relative z-10">
                            <div className="text-2xl font-bold text-orange-600">
                              {selectedProject.donations.filter((d) => (d as { status: string | null }).status && ["WAITING_TO_REVIEW", "ORDERED", "PENDING"].includes((d as { status: string }).status)).length}
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-green-500/5 via-card to-card border-green-500/20">
                          <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Complete</CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0 relative z-10">
                            <div className="text-2xl font-bold text-primary">
                              {selectedProject.donations.filter((d) => (d as { status: string | null }).status === "COMPLETE").length}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    <Separator className="my-6" />

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Project Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type</p>
                              <p className="text-base font-semibold text-foreground">{PROJECT_TYPE_LABELS[selectedProject.projectType]}</p>
                            </div>
                          </div>
                          {selectedProject.status && (
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Target className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                                {getStatusBadge(selectedProject.status)}
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Status</p>
                              <Badge className={selectedProject.isActive ? "bg-primary/10 text-primary dark:text-primary" : "bg-gray-500/10 text-gray-700 dark:text-gray-400"}>
                                {selectedProject.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-0">
                          {selectedProject.donations && selectedProject.donations.length > 0 && (
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Countries</p>
                                <div className="flex flex-wrap gap-2">
                                  {(Array.from(new Set(selectedProject.donations.map((d) => d.country?.country).filter(Boolean))) as string[]).map((c, i) => (
                                    <Badge key={i} variant="outline">{c}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          {selectedProject.completedAt && (
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Completed At</p>
                                <p className="text-base text-foreground">{new Date(selectedProject.completedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedProject.description && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 pb-2">
                            <div className="p-2 rounded-lg bg-muted/50">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Description</h3>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/30">
                            <p className="text-base text-foreground">{selectedProject.description}</p>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator className="my-6" />

                    <div className="pt-2 flex flex-col gap-2">
                      <Link
                        href={`/admin/sponsorships/${donationsSlug(selectedProject.projectType)}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Manage Donations →
                      </Link>
                      <Link
                        href={`/admin/sponsorships/${selectedProject.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit Project Settings →
                      </Link>
                    </div>
                  </TabsContent>

                  {selectedProject.donations && selectedProject.donations.length > 0 && (
                    <TabsContent value="donations" className="space-y-6 mt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Donations Summary</h3>
                          <Link
                            href={`/admin/sponsorships/${donationsSlug(selectedProject.projectType)}`}
                            className="text-sm text-primary hover:underline"
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
                                {selectedProject.donations.filter((d) => (d as { status: string | null }).status && ["WAITING_TO_REVIEW", "ORDERED", "PENDING"].includes((d as { status: string }).status)).length}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Complete</p>
                              <p className="text-lg font-bold text-primary">
                                {selectedProject.donations.filter((d) => (d as { status: string | null }).status === "COMPLETE").length}
                              </p>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Total Amount</p>
                            <p className="text-2xl font-bold">
                              £{(selectedProject.donations.reduce((s, d) => s + d.amountPence, 0) / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
