"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconDroplet, IconMapPin } from "@tabler/icons-react"
import { ExternalLink, MapPin, Target, Hash } from "lucide-react"
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
  WATER_PUMP: "Water Pump",
  WATER_WELL: "Water Well",
  WATER_TANK: "Water Tank",
  WUDHU_AREA: "Wudhu Area",
}

interface WaterProjectCountry {
  id: string
  projectType: string
  country: string
  isActive: boolean
  sortOrder: number
}

export function WaterProjectCountriesTable({ countries }: { countries: WaterProjectCountry[] }) {
  const [selectedCountry, setSelectedCountry] = useState<WaterProjectCountry | null>(null)

  const groupedCountries = countries.reduce((acc, country) => {
    if (!acc[country.projectType]) {
      acc[country.projectType] = []
    }
    acc[country.projectType].push(country)
    return acc
  }, {} as Record<string, WaterProjectCountry[]>)

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedCountries).map(([projectType, typeCountries]) => (
          <div key={projectType} className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <IconDroplet className="h-4 w-4 text-blue-500" />
              {PROJECT_TYPE_LABELS[projectType]}
            </h3>
            <AdminTable
              data={typeCountries}
              onRowClick={(country) => setSelectedCountry(country)}
              columns={[
                {
                  id: "country",
                  header: "Country",
                  cell: (country) => (
                    <div className="flex items-center gap-1">
                      <IconMapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{country.country}</span>
                    </div>
                  ),
                },
                {
                  id: "status",
                  header: "Status",
                  cell: (country) => <StatusBadge isActive={country.isActive} />,
                },
                {
                  id: "sortOrder",
                  header: "Order",
                  cell: (country) => <span className="text-sm text-muted-foreground">{country.sortOrder}</span>,
                },
                {
                  id: "actions",
                  header: "Actions",
                  cell: (country) => (
                    <Link
                      href={`/water/${
                        country.projectType === "WATER_PUMP"
                          ? "pumps"
                          : country.projectType === "WATER_WELL"
                          ? "wells"
                          : country.projectType === "WATER_TANK"
                          ? "tanks"
                          : "wudhu"
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
          </div>
        ))}
      </div>
      <Dialog
        open={!!selectedCountry}
        onOpenChange={(open) => !open && setSelectedCountry(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedCountry ? `${PROJECT_TYPE_LABELS[selectedCountry.projectType]} - ${selectedCountry.country}` : "Country Details"}
            </DialogTitle>
            <DialogDescription>
              Water project country information and settings
            </DialogDescription>
          </DialogHeader>

          {selectedCountry && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <StatusBadge isActive={selectedCountry.isActive} />
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Sort Order
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold">
                            {selectedCountry.sortOrder}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />

                    {/* Country Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Country Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Project Type
                              </p>
                              <p className="text-base font-semibold text-foreground">{PROJECT_TYPE_LABELS[selectedCountry.projectType]}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Country
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedCountry.country}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Status
                              </p>
                              <StatusBadge isActive={selectedCountry.isActive} />
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Sort Order
                              </p>
                              <p className="text-base text-foreground">{selectedCountry.sortOrder}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="pt-2">
                      <a
                        href={`/admin/water-projects/countries/${selectedCountry.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit Country →
                      </a>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
