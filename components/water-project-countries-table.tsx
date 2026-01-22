"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconDroplet, IconMapPin } from "@tabler/icons-react"
import { ExternalLink } from "lucide-react"
import { DetailModal } from "@/components/detail-modal"

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
                      href={`/admin/water-projects/countries/${country.id}/edit`}
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
      <DetailModal
        open={!!selectedCountry}
        onOpenChange={(open) => !open && setSelectedCountry(null)}
        title={selectedCountry ? `${PROJECT_TYPE_LABELS[selectedCountry.projectType]} - ${selectedCountry.country}` : "Country Details"}
      >
        {selectedCountry && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project Type</h3>
              <p className="text-base font-semibold">{PROJECT_TYPE_LABELS[selectedCountry.projectType]}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</h3>
              <p className="text-base">{selectedCountry.country}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h3>
              <StatusBadge isActive={selectedCountry.isActive} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort Order</h3>
              <p className="text-base">{selectedCountry.sortOrder}</p>
            </div>
            <div className="pt-2">
              <a
                href={`/admin/water-projects/countries/${selectedCountry.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                Edit Country →
              </a>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
