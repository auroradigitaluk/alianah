"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import Link from "next/link"
import { Users } from "lucide-react"
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
  allowFundraising?: boolean
  status: string | null
  amountPence: number
  projectImageUrls?: string | null
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
  const fundraiserSlugByType: Record<string, string> = {
    WATER_PUMP: "water-pumps",
    WATER_WELL: "water-wells",
    WATER_TANK: "water-tanks",
    WUDHU_AREA: "water-wudhu",
  }

  const selectedProjectImages = useMemo(() => {
    if (!selectedProject?.projectImageUrls) return []
    try {
      return JSON.parse(selectedProject.projectImageUrls) as string[]
    } catch {
      return []
    }
  }, [selectedProject?.projectImageUrls])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:px-6 md:py-8 max-w-2xl">
        {selectedProject && selectedProjectImages.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="space-y-4">
              {selectedProjectImages.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted"
                >
                  <Image
                    src={imageUrl}
                    alt={`${selectedProjectLabel || "Project"} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 672px"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight md:text-3xl mb-2">
            {headerTitle}
          </h1>
          {headerDescription && (
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              {headerDescription}
            </p>
          )}
        </div>

        {selectedProject && selectedProject.allowFundraising && fundraiserSlugByType[selectedProject.projectType] && (
          <div className="mb-4 sm:mb-6">
            <Button
              asChild
              className="w-full bg-primary text-primary-foreground hover:bg-black border-primary focus-visible:ring-primary/50"
              size="lg"
            >
              <Link href={`/fundraise/${fundraiserSlugByType[selectedProject.projectType]}`}>
                <Users className="mr-2 h-4 w-4" />
                Set up a fundraiser for this water project
              </Link>
            </Button>
          </div>
        )}

        <Card className="shadow-sm border">
          <CardContent className="space-y-5 pt-6">
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
  )
}
