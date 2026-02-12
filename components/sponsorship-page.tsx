"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useSidecart } from "@/components/sidecart-provider"

const SPONSORSHIP_TYPES = [
  { value: "ORPHANS", label: "Orphans" },
  { value: "HIFZ", label: "Hifz" },
  { value: "FAMILIES", label: "Families" },
]

const DONATION_TYPES = [
  { value: "GENERAL", label: "General Donation" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
]

interface SponsorshipCountry {
  id: string
  projectType: string
  country: string
  pricePence: number
  yearlyPricePence?: number | null
}

interface SponsorshipProject {
  id: string
  projectType: string
  location: string | null
  description: string | null
  projectImageUrls?: string | null
}

interface SponsorshipPageProps {
  countries: SponsorshipCountry[]
  projects: SponsorshipProject[]
  initialProjectType?: string
  lockProjectType?: boolean
  headerTitle?: string
  headerDescription?: string
}

export function SponsorshipPage({
  countries,
  projects,
  initialProjectType,
  lockProjectType = false,
  headerTitle = "Sponsorship",
  headerDescription = "Choose a sponsorship type and select a country to donate.",
}: SponsorshipPageProps) {
  const { addItem } = useSidecart()
  const [selectedProjectType, setSelectedProjectType] = useState<string>(initialProjectType || "")
  const [selectedCountryId, setSelectedCountryId] = useState<string>("")
  const [donationType, setDonationType] = useState("GENERAL")
  const [sponsorshipFrequency, setSponsorshipFrequency] = useState<"MONTHLY" | "YEARLY">("MONTHLY")

  useEffect(() => {
    if (initialProjectType) queueMicrotask(() => setSelectedProjectType(initialProjectType))
  }, [initialProjectType])

  const availableTypes = useMemo(() => {
    const typesWithProjects = new Set(projects.map((p) => p.projectType))
    const typesWithCountries = new Set(countries.map((c) => c.projectType))
    return SPONSORSHIP_TYPES.filter(
      (type) => typesWithProjects.has(type.value) && typesWithCountries.has(type.value)
    )
  }, [projects, countries])

  const selectedProject = useMemo(
    () => projects.find((project) => project.projectType === selectedProjectType) || null,
    [projects, selectedProjectType]
  )

  const selectedProjectImagesJson = selectedProject?.projectImageUrls ?? ""
  const selectedProjectImages = useMemo(() => {
    if (!selectedProjectImagesJson) return []
    try {
      return JSON.parse(selectedProjectImagesJson) as string[]
    } catch {
      return []
    }
  }, [selectedProjectImagesJson])

  const filteredCountries = useMemo(() => {
    return countries
      .filter((country) => country.projectType === selectedProjectType)
      .slice()
      .sort((a, b) => a.pricePence - b.pricePence || a.country.localeCompare(b.country))
  }, [countries, selectedProjectType])

  const selectedCountry = filteredCountries.find((c) => c.id === selectedCountryId) || null
  const hasYearlyOption = filteredCountries.some((c) => (c.yearlyPricePence || 0) > 0)

  useEffect(() => {
    if (!hasYearlyOption && sponsorshipFrequency === "YEARLY") {
      queueMicrotask(() => setSponsorshipFrequency("MONTHLY"))
    }
  }, [hasYearlyOption, sponsorshipFrequency])

  useEffect(() => {
    if (
      sponsorshipFrequency === "YEARLY" &&
      selectedCountry &&
      !selectedCountry.yearlyPricePence
    ) {
      queueMicrotask(() => setSponsorshipFrequency("MONTHLY"))
    }
  }, [selectedCountry, sponsorshipFrequency])

  const handleAddToBasket = () => {
    if (!selectedProjectType) {
      toast.error("Please select a sponsorship type")
      return
    }
    if (!selectedCountry) {
      toast.error("Please select a country")
      return
    }
    if (!selectedProject) {
      toast.error("Sponsorship project not available")
      return
    }
    if (sponsorshipFrequency === "YEARLY" && (!selectedCountry?.yearlyPricePence || selectedCountry.yearlyPricePence <= 0)) {
      toast.error("Yearly price not available for this country")
      return
    }

    const label =
      SPONSORSHIP_TYPES.find((type) => type.value === selectedProjectType)?.label ||
      selectedProjectType
    const isYearly = sponsorshipFrequency === "YEARLY"
    const amountPence = isYearly
      ? selectedCountry.yearlyPricePence || selectedCountry.pricePence
      : selectedCountry.pricePence

    addItem({
      id: "",
      appealTitle: `Sponsorship - ${label}`,
      productName: isYearly ? `${selectedCountry.country} (Yearly)` : selectedCountry.country,
      frequency: isYearly ? "ONE_OFF" : "MONTHLY",
      donationType: donationType as "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH",
      amountPence,
      sponsorshipProjectId: selectedProject.id,
      sponsorshipCountryId: selectedCountry.id,
      sponsorshipProjectType: selectedProject.projectType,
    })
    toast.success("Added to basket")
  }

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
                    alt={`Sponsorship - Image ${index + 1}`}
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

        <Card className="shadow-sm border">
          <CardContent className="space-y-5 pt-6">
            {!lockProjectType && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Select Sponsorship Type</Label>
                <div className="grid grid-cols-3 gap-2 w-full place-items-stretch">
                  {availableTypes.map((type) => (
                    <Button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setSelectedProjectType(type.value)
                        setSelectedCountryId("")
                      }}
                      variant={selectedProjectType === type.value ? "default" : "outline"}
                      className={[
                        "w-full h-11 justify-center",
                        selectedProjectType === type.value && "shadow-sm",
                      ].filter(Boolean).join(" ")}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {!selectedProjectType && (
              <p className="text-sm text-muted-foreground">
                Select a sponsorship type to continue.
              </p>
            )}

            {selectedProjectType && !selectedProject && (
              <p className="text-sm text-muted-foreground">
                No active project available for this sponsorship type.
              </p>
            )}

            {selectedProjectType && filteredCountries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Select Country</Label>
                <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
                  {filteredCountries.map((country) => {
                    const yearlyAvailable = !!country.yearlyPricePence && country.yearlyPricePence > 0
                    const isYearly = sponsorshipFrequency === "YEARLY"
                    const isDisabled = isYearly && !yearlyAvailable
                    const isSelected = selectedCountryId === country.id
                    const displayPrice = isYearly
                      ? country.yearlyPricePence || country.pricePence
                      : country.pricePence
                    return (
                      <Button
                        key={country.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => !isDisabled && setSelectedCountryId(country.id)}
                        disabled={isDisabled}
                        className={[
                          "group w-full h-16 flex-col items-center justify-center px-3 py-2.5 text-center",
                          isSelected && "shadow-sm",
                        ].filter(Boolean).join(" ")}
                      >
                        <span className="text-sm font-medium leading-tight">
                          {country.country}
                        </span>
                        <span className="text-base font-semibold leading-tight">
                          {isDisabled
                            ? "Yearly not set"
                            : `£${(displayPrice / 100).toFixed(2)}${isYearly ? "/year" : "/month"}`}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedProjectType && hasYearlyOption && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Sponsorship Length</Label>
                <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
                  <Button
                    type="button"
                    variant={sponsorshipFrequency === "MONTHLY" ? "default" : "outline"}
                    onClick={() => setSponsorshipFrequency("MONTHLY")}
                    className={[
                      "w-full h-11 justify-center",
                      sponsorshipFrequency === "MONTHLY" && "shadow-sm",
                    ].filter(Boolean).join(" ")}
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    variant={sponsorshipFrequency === "YEARLY" ? "default" : "outline"}
                    onClick={() => setSponsorshipFrequency("YEARLY")}
                    className={[
                      "w-full h-11 justify-center",
                      sponsorshipFrequency === "YEARLY" && "shadow-sm",
                    ].filter(Boolean).join(" ")}
                  >
                    Yearly (one-off)
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Donation Type</Label>
              <Select value={donationType} onValueChange={setDonationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DONATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" className="w-full" onClick={handleAddToBasket}>
              Add to basket
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
