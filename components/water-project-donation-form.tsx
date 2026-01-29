"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useSidecart } from "@/components/sidecart-provider"

interface WaterProjectDonationFormProps {
  projectId: string
  projectType: string
  fundraiserId?: string
}

const DONATION_TYPES = [
  { value: "GENERAL", label: "General Donation" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
]

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pump",
  WATER_WELL: "Water Well",
  WATER_TANK: "Water Tank",
  WUDHU_AREA: "Wudhu Area",
}

export function WaterProjectDonationForm({
  projectId,
  projectType,
  fundraiserId,
}: WaterProjectDonationFormProps) {
  const { addItem } = useSidecart()
  const [countryId, setCountryId] = useState<string>("")
  const [donationType, setDonationType] = useState("GENERAL")
  const [countries, setCountries] = useState<Array<{ id: string; country: string; pricePence: number }>>([])
  const [isAnonymous, setIsAnonymous] = useState(false)

  // Fetch countries for this project type
  React.useEffect(() => {
    fetch(`/api/admin/water-projects/countries?projectType=${projectType}`)
      .then(res => res.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          setCountries([])
          return
        }
        const filtered = data
          .filter((c): c is { id: string; country: string; pricePence: number; projectType: string; isActive?: boolean } => {
            return (
              typeof c === "object" &&
              c !== null &&
              "id" in c &&
              "country" in c &&
              "pricePence" in c &&
              "projectType" in c &&
              typeof (c as { id?: unknown }).id === "string" &&
              Boolean((c as { id?: string }).id?.trim()) &&
              typeof (c as { country?: unknown }).country === "string" &&
              typeof (c as { pricePence?: unknown }).pricePence === "number" &&
              (c as { projectType?: unknown }).projectType === projectType &&
              (c as { isActive?: unknown }).isActive !== false
            )
          })
          .map((c) => ({ id: c.id, country: c.country, pricePence: c.pricePence }))
        setCountries(filtered)
      })
      .catch(err => console.error("Error fetching countries:", err))
  }, [projectType])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!countryId) {
      toast.error("Please select a country")
      return
    }

    const selectedCountry = countries.find((c) => c.id === countryId)
    if (!selectedCountry) {
      toast.error("Selected country not found")
      return
    }

    const projectLabel = PROJECT_TYPE_LABELS[projectType] || "Water Project"
    addItem({
      id: "",
      appealTitle: projectLabel,
      productName: selectedCountry.country,
      frequency: "ONE_OFF",
      donationType: donationType as "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH",
      amountPence: selectedCountry.pricePence,
      waterProjectId: projectId,
      waterProjectCountryId: selectedCountry.id,
      ...(fundraiserId ? { fundraiserId } : {}),
      ...(fundraiserId ? { isAnonymous } : {}),
    })
    toast.success("Added to basket")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Select Country *</Label>
        <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
          {countries
            .filter((country) => country.id.trim())
            .slice()
            .sort((a, b) => a.pricePence - b.pricePence || a.country.localeCompare(b.country))
            .map((country) => {
              const isSelected = countryId === country.id
              return (
                <Button
                  key={country.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => {
                    setCountryId(country.id)
                  }}
                  className={[
                    "group w-full h-16 flex-col items-center justify-center px-3 py-2.5 text-center hover:!bg-primary hover:!text-primary-foreground hover:!border-primary",
                    isSelected && "shadow-sm",
                  ].filter(Boolean).join(" ")}
                >
                  <span className="text-sm font-medium leading-tight">
                    {country.country}
                  </span>
                  <span
                    className={[
                      "text-sm font-medium mt-0.5 leading-tight text-center group-hover:text-white",
                      isSelected ? "text-primary-foreground/90" : "text-foreground/80",
                    ].join(" ")}
                  >
                    £{(country.pricePence / 100).toFixed(2)}
                  </span>
                </Button>
              )
            })}
        </div>
        {countryId && (
          <p className="text-sm text-muted-foreground">
            Amount: £{(countries.find(c => c.id === countryId)?.pricePence || 0) / 100}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Donation Type</Label>
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
      {fundraiserId && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="donate-anonymous"
            checked={isAnonymous}
            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
          />
          <Label htmlFor="donate-anonymous" className="font-normal cursor-pointer">
            Donate anonymously
          </Label>
        </div>
      )}
      <Button type="submit" className="w-full">
        Add to basket
      </Button>
    </form>
  )
}
