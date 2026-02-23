"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useSidecart } from "@/components/sidecart-provider"
import { formatCurrencyWhole } from "@/lib/utils"

const PRESET_CONTRIBUTION_AMOUNTS_PENCE = [2000, 5000, 10000, 25000] // £20, £50, £100, £250

interface WaterProjectDonationFormProps {
  projectId: string
  projectType: string
  fundraiserId?: string
  plaqueAvailable?: boolean
  /** When set (e.g. from fundraiser page), contribution goes to this country - show amount presets only */
  presetCountry?: { id: string; country: string; pricePence: number }
  /** Legacy: when no presetCountry, resolve country by amount (e.g. from fundraiser targetAmountPence) */
  presetAmountPence?: number
  /** When set (from fundraiser), use this plaque name; hide plaque field from donors */
  presetPlaqueName?: string
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
  plaqueAvailable,
  presetCountry,
  presetAmountPence,
  presetPlaqueName,
}: WaterProjectDonationFormProps) {
  const { addItem } = useSidecart()
  const isFundraiserContribution = Boolean(
    fundraiserId && (presetCountry || presetAmountPence != null)
  )
  const [countryId, setCountryId] = useState<string>(presetCountry?.id ?? "")
  const [donationType, setDonationType] = useState("GENERAL")
  const [countries, setCountries] = useState<Array<{ id: string; country: string; pricePence: number }>>([])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [selectedAmountPence, setSelectedAmountPence] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")

  // Fetch countries for this project type
  React.useEffect(() => {
    fetch(`/api/water-projects/countries?projectType=${projectType}`)
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
        // Legacy: preselect country by amount when no presetCountry
        if (presetAmountPence != null && !presetCountry) {
          const match = filtered.find((c) => c.pricePence === presetAmountPence)
          if (match) setCountryId(match.id)
        }
      })
      .catch(err => console.error("Error fetching countries:", err))
  }, [projectType, presetCountry, presetAmountPence])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const resolvedCountry = presetCountry ?? countries.find((c) => c.id === countryId)
    if (!resolvedCountry) {
      toast.error(presetCountry ? "Invalid preset" : "Please select a country")
      return
    }
    if (!presetCountry && !countryId && !isFundraiserContribution) {
      toast.error("Please select a country")
      return
    }

    let amountPence: number
    if (isFundraiserContribution) {
      const normalizedAmount = customAmount.trim().replace(",", ".")
      const customPence = normalizedAmount ? Math.round(parseFloat(normalizedAmount) * 100) : 0
      if (selectedAmountPence != null && selectedAmountPence > 0) {
        amountPence = selectedAmountPence
      } else if (!Number.isNaN(customPence) && customPence > 0) {
        amountPence = customPence
      } else {
        toast.error("Please select an amount or enter a custom amount")
        return
      }
    } else {
      amountPence = resolvedCountry.pricePence
    }

    const projectLabel = PROJECT_TYPE_LABELS[projectType] || "Water Project"
    try {
      addItem({
        id: "",
        appealTitle: projectLabel,
        productName: resolvedCountry.country,
        frequency: "ONE_OFF",
        donationType: donationType as "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH",
        amountPence,
        waterProjectId: projectId,
        waterProjectCountryId: resolvedCountry.id,
        ...(plaqueAvailable && presetPlaqueName ? { plaqueName: presetPlaqueName.trim() } : {}),
        ...(fundraiserId ? { fundraiserId } : {}),
        ...(fundraiserId ? { isAnonymous } : {}),
      })
      toast.success("Added to basket")
    } catch (err) {
      console.error("Add to basket failed:", err)
      toast.error("Could not add to basket. Please try again.")
    }
  }

  const resolvedCountry = presetCountry ?? countries.find((c) => c.id === countryId)
  const normalizedCustom = customAmount.trim().replace(",", ".")
  const hasContributionAmount =
    (selectedAmountPence != null && selectedAmountPence > 0) ||
    (normalizedCustom !== "" && !Number.isNaN(parseFloat(normalizedCustom)) && parseFloat(normalizedCustom) > 0)
  const canSubmit =
    resolvedCountry &&
    (!isFundraiserContribution || hasContributionAmount)

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full min-w-0">
      <div className="space-y-2">
        {isFundraiserContribution ? (
          <>
            <Label className="text-base">Amount</Label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2">
              {PRESET_CONTRIBUTION_AMOUNTS_PENCE.map((pence) => {
                const isSelected = selectedAmountPence === pence
                return (
                  <Button
                    key={pence}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => {
                      setSelectedAmountPence(pence)
                      setCustomAmount("")
                    }}
                    className="h-11 min-h-[44px] text-base w-full min-w-0 touch-manipulation"
                  >
                    {formatCurrencyWhole(pence)}
                  </Button>
                )
              })}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-medium pointer-events-none">
                £
              </span>
              <Input
                id="custom-amount-fundraiser"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value)
                  if (e.target.value.trim()) setSelectedAmountPence(null)
                }}
                className="h-11 min-h-[44px] text-base pl-7 w-full"
              />
            </div>
          </>
        ) : presetCountry ? (
          <>
            <Label>Donation amount</Label>
            <div className="rounded-lg border bg-muted/50 px-4 py-3 flex items-center justify-between gap-3 min-w-0">
              <span className="font-medium truncate min-w-0">{presetCountry.country}</span>
              <span className="font-semibold shrink-0">£{(presetCountry.pricePence / 100).toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              One {PROJECT_TYPE_LABELS[projectType] || "water project"} for this fundraiser.
            </p>
          </>
        ) : (
          <>
            <Label>Select Country *</Label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full place-items-stretch">
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
                        "group w-full h-16 min-h-[44px] flex-col items-center justify-center px-3 py-2.5 text-center hover:!bg-primary hover:!text-primary-foreground hover:!border-primary touch-manipulation",
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
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label>Donation Type</Label>
        <Select value={donationType} onValueChange={setDonationType}>
          <SelectTrigger className="h-11 min-h-[44px] w-full touch-manipulation">
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
        <div className="flex items-center space-x-2 py-2 touch-manipulation">
          <Checkbox
            id="donate-anonymous"
            checked={isAnonymous}
            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
          />
          <Label htmlFor="donate-anonymous" className="font-normal cursor-pointer flex-1 min-w-0">
            Donate anonymously
          </Label>
        </div>
      )}
      <Button type="submit" className="w-full h-12 min-h-[48px] text-base touch-manipulation" disabled={!canSubmit}>
        Add to basket
      </Button>
    </form>
  )
}
