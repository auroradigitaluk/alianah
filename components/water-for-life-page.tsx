"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { IconDroplet } from "@tabler/icons-react"
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
}

export function WaterForLifePage({ countries, projects }: WaterForLifePageProps) {
  const [selectedProjectType, setSelectedProjectType] = useState<string>("")
  const [selectedCountryId, setSelectedCountryId] = useState<string>("")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const filteredCountries = countries.filter(
    (c) => !selectedProjectType || c.projectType === selectedProjectType
  )

  const filteredProjects = projects.filter((p) => {
    if (selectedProjectType && p.projectType !== selectedProjectType) return false
    // Filter by country if selected - check if project has donations with that country
    if (selectedCountryId) {
      const country = countries.find(c => c.id === selectedCountryId)
      if (country) {
        // Check if this project type matches the selected country's project type
        return p.projectType === country.projectType
      }
    }
    return true
  })

  const getTotalDonated = (project: Project) => {
    return project.donations.reduce((sum, d) => sum + d.amountPence, 0)
  }

  const getProgress = (project: Project) => {
    const donated = getTotalDonated(project)
    return project.amountPence > 0 ? (donated / project.amountPence) * 100 : 0
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 max-w-6xl">
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <IconDroplet className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Water for Life</h1>
          </div>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            Help provide clean water to communities in need through our water projects
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {PROJECT_TYPES.map((type) => (
            <Card
              key={type.value}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedProjectType === type.value ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => {
                setSelectedProjectType(type.value)
                setSelectedCountryId("")
                setSelectedProject(null)
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconDroplet className="h-5 w-5 text-blue-500" />
                  {type.label}
                </CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {selectedProjectType && (
          <div className="mb-6 sm:mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Select Country</CardTitle>
                <CardDescription className="text-sm sm:text-base">Choose a country for {PROJECT_TYPES.find((t) => t.value === selectedProjectType)?.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCountries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )}

        {filteredProjects.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">Available Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredProjects.map((project) => {
                const donated = getTotalDonated(project)
                const projectCountries = countries.filter(c => c.projectType === project.projectType)
                return (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedProject?.id === project.id ? "ring-2 ring-blue-500" : ""
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <CardHeader>
                      <CardTitle>{PROJECT_TYPES.find(t => t.value === project.projectType)?.label}</CardTitle>
                      <CardDescription>{project.location || "Multiple countries available"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                      )}
                      <div className="space-y-2 mb-4">
                        <div className="text-sm font-medium">Available Countries:</div>
                        <div className="flex flex-wrap gap-2">
                          {projectCountries.map((country) => (
                            <Badge key={country.id} variant="outline">
                              {country.country} - £{(country.pricePence / 100).toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {donated > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Total Raised</span>
                            <span className="font-semibold">£{(donated / 100).toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project.donations.length} donation{project.donations.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {selectedProject && (
          <Card>
            <CardHeader>
              <CardTitle>Donate to {PROJECT_TYPES.find((t) => t.value === selectedProject.projectType)?.label}</CardTitle>
              <CardDescription>
                Choose a country to donate to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WaterProjectDonationForm projectId={selectedProject.id} projectType={selectedProject.projectType} />
            </CardContent>
          </Card>
        )}

        {selectedProjectType && filteredProjects.length === 0 && !selectedProject && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {selectedCountryId
                  ? "No projects available for this country. Please check back later."
                  : "Please select a country to see available projects."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
