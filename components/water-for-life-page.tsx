"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { WaterProjectDonationForm } from "@/components/water-project-donation-form"

const PROJECT_TYPES = [
  { value: "WATER_PUMP", label: "Water Pump", description: "Provide clean water access through water pumps" },
  { value: "WATER_WELL", label: "Water Well", description: "Build water wells for communities in need" },
  { value: "WATER_TANK", label: "Water Tank", description: "Install water storage tanks for reliable supply" },
  { value: "WUDHU_AREA", label: "Wudhu Area", description: "Construct wudhu facilities for mosques and communities" },
]

interface Country {
  id: string
  projectType: string
  country: string
  pricePence: number
}

interface Project {
  id: string
  projectType: string
  location: string | null
  description: string | null
  status: string | null
  amountPence: number
  donations: Array<{
    amountPence: number
    country: {
      country: string
      pricePence: number
    }
  }>
}

interface WaterForLifePageProps {
  countries: Country[]
  projects: Project[]
  initialProjectType?: string
  lockProjectType?: boolean
  headerTitle?: string
  headerDescription?: string
}

export function WaterForLifePage({
  countries,
  projects,
  initialProjectType,
  lockProjectType = false,
  headerTitle = "Water for Life",
  headerDescription = "Choose a water project type and select a country to donate.",
}: WaterForLifePageProps) {
  const [selectedProjectType, setSelectedProjectType] = useState<string>(initialProjectType || "")

  useEffect(() => {
    if (initialProjectType) {
      setSelectedProjectType(initialProjectType)
    }
  }, [initialProjectType])

  const availableProjectTypes = useMemo(() => {
    const activeTypes = new Set(projects.map((p) => p.projectType))
    return PROJECT_TYPES.filter((type) => activeTypes.has(type.value))
  }, [projects])

  const selectedProject = useMemo(
    () => projects.find((project) => project.projectType === selectedProjectType) || null,
    [projects, selectedProjectType]
  )

  const selectedProjectLabel =
    PROJECT_TYPES.find((type) => type.value === selectedProjectType)?.label || ""

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 md:px-6">
        <div className="w-full max-w-4xl mx-auto">
          <Card className="shadow-sm border">
            <CardHeader className="pb-4">
              <h2 className="text-xl font-semibold tracking-tight">{headerTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {headerDescription}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {!lockProjectType && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Water Project Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full place-items-stretch">
                    {availableProjectTypes.map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        onClick={() => setSelectedProjectType(type.value)}
                        variant={selectedProjectType === type.value ? "default" : "outline"}
                        className="w-full h-11 justify-center"
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {!selectedProjectType && (
                <p className="text-sm text-muted-foreground">
                  Select a water project type to continue.
                </p>
              )}

              {selectedProjectType && !selectedProject && (
                <p className="text-sm text-muted-foreground">
                  No active project available for {selectedProjectLabel || "this type"}.
                </p>
              )}

              {selectedProject && (
                <WaterProjectDonationForm
                  projectId={selectedProject.id}
                  projectType={selectedProject.projectType}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
