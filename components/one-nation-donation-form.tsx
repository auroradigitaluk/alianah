"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useSidecart } from "@/components/sidecart-provider"
import { cn } from "@/lib/utils"

type DonationType = "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
type Preset = { amountPence: number; label?: string }

const isDonationType = (value: string): value is DonationType =>
  value === "GENERAL" || value === "SADAQAH" || value === "ZAKAT" || value === "LILLAH"

interface Appeal {
  id: string
  title: string
  slug: string
  allowMonthly: boolean
  monthlyPricePence: number | null
  oneOffPresetAmountsPence?: string
  monthlyPresetAmountsPence?: string
}

interface Product {
  id: string
  name: string
  type: string // FIXED | VARIABLE
  fixedAmountPence: number | null
  minAmountPence: number | null
  maxAmountPence: number | null
}

interface AppealProduct {
  productId: string
  frequency: string
  presetAmountsPence: string
  allowCustom: boolean
  product: Product
}

interface WaterProject {
  id: string
  projectType: string // WATER_PUMP | WATER_WELL | WATER_TANK | WUDHU_AREA
  location: string | null
  description: string | null
}

interface WaterProjectCountry {
  id: string
  projectType: string
  country: string
  pricePence: number
}

interface OneNationDonationFormProps {
  appeals: Appeal[]
  products?: AppealProduct[]
  donationTypesEnabled: string[]
  waterProjects?: WaterProject[]
  waterProjectCountries?: WaterProjectCountry[]
}


export function OneNationDonationForm({
  appeals,
  products = [],
  donationTypesEnabled,
  waterProjects = [],
  waterProjectCountries = [],
}: OneNationDonationFormProps) {
  const { addItem } = useSidecart()

  const [frequency, setFrequency] = React.useState<"ONE_OFF" | "MONTHLY">("ONE_OFF")
  const [donationType, setDonationType] = React.useState<"appeal" | "water">("appeal")
  const [selectedAppeal, setSelectedAppeal] = React.useState<string>("")
  const [selectedWaterProject, setSelectedWaterProject] = React.useState<string>("")
  const [selectedIntention, setSelectedIntention] = React.useState<DonationType | "">("")
  const [selectedWaterCountry, setSelectedWaterCountry] = React.useState<string>("")
  const [customAmount, setCustomAmount] = React.useState<string>("")
  const [selectedProduct, setSelectedProduct] = React.useState<string>("")
  const [plaqueName, setPlaqueName] = React.useState<string>("")

  // Get selected appeal or water project data
  const appealData = appeals.find((a) => a.id === selectedAppeal)
  const waterProjectData = waterProjects.find((p) => p.id === selectedWaterProject)
  
  // Get available products for selected appeal and frequency
  const availableProducts = selectedAppeal
    ? products.filter((p) => p.frequency === frequency)
    : []

  // Get selected product data
  const selectedProductData = availableProducts.find((p) => p.productId === selectedProduct)
  
  // Check if selected product allows custom amounts
  const productAllowsCustom = selectedProductData?.allowCustom ?? true
  
  // Check if product has fixed frequencies (monthly/yearly only, no custom)
  const productHasFixedFrequencies = selectedProductData && !selectedProductData.allowCustom && 
    (selectedProductData.frequency === "MONTHLY")
  
  // Get preset amounts for product
  const productPresetAmounts = selectedProductData?.presetAmountsPence
    ? JSON.parse(selectedProductData.presetAmountsPence) as number[]
    : []
  
  // Get preset amount for monthly from appeal (appeals do not support yearly)
  const monthlyPresetAmount = appealData?.monthlyPricePence
    ? appealData.monthlyPricePence / 100
    : null

  const parsePresetJson = (value?: string): Preset[] => {
    if (!value) return []
    try {
      const arr: unknown = JSON.parse(value)
      if (!Array.isArray(arr)) return []
      return arr
        .map((item): Preset | null => {
          if (typeof item === "number" && Number.isFinite(item) && item > 0) {
            return { amountPence: item }
          }
          if (item && typeof item === "object") {
            const amountPence =
              "amountPence" in item && typeof (item as { amountPence?: unknown }).amountPence === "number"
                ? (item as { amountPence: number }).amountPence
                : null
            if (!amountPence || !Number.isFinite(amountPence) || amountPence <= 0) return null
            const label =
              "label" in item && typeof (item as { label?: unknown }).label === "string"
                ? (item as { label: string }).label.trim()
                : undefined
            return { amountPence, ...(label ? { label } : {}) }
          }
          return null
        })
        .filter((p): p is Preset => Boolean(p))
    } catch {
      return []
    }
  }

  const getAppealPresets = (): Preset[] => {
    if (!appealData) return []
    if (frequency === "MONTHLY") {
      const monthly = parsePresetJson(appealData.monthlyPresetAmountsPence)
      if (monthly.length > 0) return monthly
      return appealData.monthlyPricePence ? [{ amountPence: appealData.monthlyPricePence }] : []
    }
    return parsePresetJson(appealData.oneOffPresetAmountsPence)
  }

  const appealPresets = getAppealPresets()

  // Get available countries for selected water project
  const availableWaterCountries = selectedWaterProject
    ? waterProjectCountries.filter((c) => c.projectType === waterProjectData?.projectType)
    : []
  
  // Get selected water country data
  const selectedWaterCountryData = availableWaterCountries.find((c) => c.id === selectedWaterCountry)
  
  // Check if water project requires plaque name (water pump)
  const requiresPlaqueName = waterProjectData?.projectType === "WATER_PUMP"

  const handleAddToBag = () => {
    if (donationType === "appeal" && !selectedAppeal) {
      alert("Please select a project")
      return
    }

    if (donationType === "water" && !selectedWaterProject) {
      alert("Please select a water project")
      return
    }

    if (donationType === "water" && !selectedWaterCountry) {
      alert("Please select a country")
      return
    }

    if (!selectedIntention) {
      alert("Please select an intention")
      return
    }

    if (requiresPlaqueName && !plaqueName.trim()) {
      alert("Please enter a name for the plaque")
      return
    }

    let amountPence = 0
    let productId: string | undefined
    let productName: string | undefined

    if (donationType === "water") {
      // Water project donation - use country price or custom amount
      if (selectedWaterCountryData) {
        if (customAmount) {
          const amount = parseFloat(customAmount)
          if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount")
            return
          }
          amountPence = Math.round(amount * 100)
        } else {
          amountPence = selectedWaterCountryData.pricePence
        }
      } else {
        alert("Please select a country")
        return
      }
    } else if (selectedProduct && selectedProductData) {
      // Product selected
      productId = selectedProductData.productId
      productName = selectedProductData.product.name
      
      if (selectedProductData.product.fixedAmountPence) {
        amountPence = selectedProductData.product.fixedAmountPence
      } else if (productPresetAmounts.length > 0 && !productAllowsCustom) {
        // Product with preset amounts only (no custom)
        if (frequency === "MONTHLY" && monthlyPresetAmount) {
          amountPence = Math.round(monthlyPresetAmount * 100)
        } else {
          alert("Please select a valid frequency for this product")
          return
        }
      } else if (customAmount) {
        const amount = parseFloat(customAmount)
        if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount")
          return
        }
        amountPence = Math.round(amount * 100)
      } else {
        alert("Please enter an amount")
        return
      }
    } else {
      // Direct donation to appeal
      if (customAmount) {
        const amount = parseFloat(customAmount)
        if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount")
          return
        }
        amountPence = Math.round(amount * 100)
      } else if (frequency === "MONTHLY" && monthlyPresetAmount) {
        amountPence = Math.round(monthlyPresetAmount * 100)
      } else {
        alert("Please enter an amount")
        return
      }
    }

    if (donationType === "water") {
      // Water project donation
      const projectTypeLabels: Record<string, string> = {
        WATER_PUMP: "Water Pump",
        WATER_WELL: "Water Well",
        WATER_TANK: "Water Tank",
        WUDHU_AREA: "Wudhu Area",
      }
      addItem({
        id: "",
        appealTitle: waterProjectData?.location || projectTypeLabels[waterProjectData?.projectType || ""] || "Water Project",
        frequency: "ONE_OFF",
        donationType: selectedIntention,
        amountPence,
        waterProjectId: selectedWaterProject,
        waterProjectCountryId: selectedWaterCountry,
        plaqueName: requiresPlaqueName ? plaqueName : undefined,
      })
    } else {
      // Appeal donation
      addItem({
        id: "",
        appealId: selectedAppeal,
        appealTitle: appealData?.title || "",
        productId,
        productName,
        frequency: frequency === "ONE_OFF" ? "ONE_OFF" : "MONTHLY",
        donationType: selectedIntention,
        amountPence,
      })
    }

    // Reset form
    setCustomAmount("")
    setSelectedProduct("")
    setPlaqueName("")
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Donation Form Card */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4">
          <h2 className="text-xl font-semibold tracking-tight">Make a Donation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select your donation preferences and add items to your donation bag
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Donation Type Toggle (Appeal vs Water Project) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Donation Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setDonationType("appeal")
                  setSelectedWaterProject("")
                  setSelectedWaterCountry("")
                }}
                variant={donationType === "appeal" ? "default" : "outline"}
                className={cn(
                  "flex-1 h-11 text-sm font-medium transition-all",
                  donationType === "appeal" && "shadow-sm"
                )}
              >
                Appeals & Projects
              </Button>
              {waterProjects.length > 0 && (
                <Button
                  type="button"
                  onClick={() => {
                    setDonationType("water")
                    setSelectedAppeal("")
                    setSelectedProduct("")
                  }}
                  variant={donationType === "water" ? "default" : "outline"}
                  className={cn(
                    "flex-1 h-11 text-sm font-medium transition-all",
                    donationType === "water" && "shadow-sm"
                  )}
                >
                  Water for Life
                </Button>
              )}
            </div>
          </div>

          {/* Frequency Toggle (only for appeals, not water projects) */}
          {donationType === "appeal" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Donation Frequency</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setFrequency("ONE_OFF")}
                  variant={frequency === "ONE_OFF" ? "default" : "outline"}
                  className={cn(
                    "flex-1 h-11 text-sm font-medium transition-all",
                    frequency === "ONE_OFF" && "shadow-sm"
                  )}
                >
                  One-Off
                </Button>
                <Button
                  type="button"
                  onClick={() => setFrequency("MONTHLY")}
                  variant={frequency === "MONTHLY" ? "default" : "outline"}
                  disabled={!!(productHasFixedFrequencies && selectedProductData?.frequency !== "MONTHLY")}
                  className={cn(
                    "flex-1 h-11 text-sm font-medium transition-all",
                    frequency === "MONTHLY" && "shadow-sm"
                  )}
                >
                  Monthly
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Recurring donations are monthly for appeals.
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Select Project/Appeal or Water Project */}
            {donationType === "appeal" ? (
              <div className="space-y-2">
                <Label htmlFor="project-select" className="text-sm font-medium text-foreground">
                  Select Project <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedAppeal} onValueChange={(value) => {
                  setSelectedAppeal(value)
                  setSelectedProduct("")
                }}>
                  <SelectTrigger id="project-select" className="h-11">
                    <SelectValue placeholder="Choose a project to support" />
                  </SelectTrigger>
                  <SelectContent>
                    {appeals.map((appeal) => (
                      <SelectItem key={appeal.id} value={appeal.id}>
                        {appeal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="water-project-select" className="text-sm font-medium text-foreground">
                  Select Water Project <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedWaterProject} onValueChange={(value) => {
                  setSelectedWaterProject(value)
                  setSelectedWaterCountry("")
                }}>
                  <SelectTrigger id="water-project-select" className="h-11">
                    <SelectValue placeholder="Choose a water project" />
                  </SelectTrigger>
                  <SelectContent>
                    {waterProjects.map((project) => {
                      const projectTypeLabels: Record<string, string> = {
                        WATER_PUMP: "Water Pump",
                        WATER_WELL: "Water Well",
                        WATER_TANK: "Water Tank",
                        WUDHU_AREA: "Wudhu Area",
                      }
                      return (
                        <SelectItem key={project.id} value={project.id}>
                          {project.location || projectTypeLabels[project.projectType] || project.projectType}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Water Project Country Selection */}
            {donationType === "water" && selectedWaterProject && availableWaterCountries.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="water-country-select" className="text-sm font-medium text-foreground">
                  Select Country <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedWaterCountry} onValueChange={setSelectedWaterCountry}>
                  <SelectTrigger id="water-country-select" className="h-11">
                    <SelectValue placeholder="Choose a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWaterCountries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.country} - £{(country.pricePence / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedWaterCountryData && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard price: £{(selectedWaterCountryData.pricePence / 100).toFixed(2)} (or enter custom amount below)
                  </p>
                )}
              </div>
            )}

            {/* Product Selection (if appeal selected and products available) */}
            {donationType === "appeal" && selectedAppeal && availableProducts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="product-select" className="text-sm font-medium text-foreground">
                  Select Product <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Select value={selectedProduct} onValueChange={(value) => {
                  setSelectedProduct(value)
                  setCustomAmount("")
                }}>
                  <SelectTrigger id="product-select" className="h-11">
                    <SelectValue placeholder="Choose a specific product or make a direct donation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Direct Donation</SelectItem>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.productId} value={p.productId}>
                        {p.product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Product Preset Amounts (for products with fixed amounts, like orphan sponsorship) */}
            {donationType === "appeal" && selectedProduct && selectedProductData && productPresetAmounts.length > 0 && !productAllowsCustom && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Select Amount <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {productPresetAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={customAmount === (amount / 100).toString() ? "default" : "outline"}
                      onClick={() => setCustomAmount((amount / 100).toString())}
                      className="h-11"
                    >
                      £{(amount / 100).toFixed(2)}{frequency === "MONTHLY" ? "/month" : ""}
                    </Button>
                  ))}
                </div>
                {frequency === "MONTHLY" && monthlyPresetAmount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Monthly: £{monthlyPresetAmount.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Appeal Preset Amounts (direct donation) */}
            {donationType === "appeal" && selectedAppeal && (!selectedProduct || productAllowsCustom) && appealPresets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Suggested Amounts <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {appealPresets.map((preset) => (
                    <Button
                      key={preset.amountPence}
                      type="button"
                      variant={customAmount === (preset.amountPence / 100).toString() ? "default" : "outline"}
                      onClick={() => setCustomAmount((preset.amountPence / 100).toString())}
                      className={preset.label ? "group h-auto py-2.5" : "group h-11"}
                    >
                      <span className="flex flex-col items-center leading-tight">
                        <span className="group-hover:text-white">
                          £{(preset.amountPence / 100).toFixed(2)}{frequency === "MONTHLY" ? "/month" : ""}
                        </span>
                        {preset.label && (
                          <span className="text-xs font-medium text-foreground/80 mt-1 leading-snug line-clamp-3 text-center whitespace-normal group-hover:text-white">
                            {preset.label}
                          </span>
                        )}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount Input (if product allows custom or no product selected, or water project) */}
            {((donationType === "water") || 
              (donationType === "appeal" && (!selectedProduct || productAllowsCustom))) && (
              <div className="space-y-2">
                <Label htmlFor="amount-input" className="text-sm font-medium text-foreground">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                    £
                  </span>
                  <Input
                    id="amount-input"
                    type="number"
                    placeholder={
                      donationType === "water" && selectedWaterCountryData
                        ? (selectedWaterCountryData.pricePence / 100).toFixed(2)
                        : donationType === "appeal" && appealPresets.length > 0
                        ? (appealPresets[0].amountPence / 100).toFixed(2)
                        : frequency === "MONTHLY" && monthlyPresetAmount
                        ? monthlyPresetAmount.toString()
                        : "Enter amount"
                    }
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min="1"
                    step="0.01"
                    className="h-11 pl-7"
                    disabled={!!(donationType === "appeal" && selectedProduct && !productAllowsCustom)}
                  />
                </div>
                {donationType === "appeal" && frequency === "MONTHLY" && monthlyPresetAmount && !selectedProduct && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested monthly amount: £{monthlyPresetAmount.toFixed(2)}
                  </p>
                )}
                {donationType === "appeal" && selectedProduct && !productAllowsCustom && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This product has fixed amounts only. Please select from the options above.
                  </p>
                )}
              </div>
            )}

            {/* Plaque Name Field (for water pumps) */}
            {requiresPlaqueName && selectedWaterProject && (
              <div className="space-y-2">
                <Label htmlFor="plaque-name-input" className="text-sm font-medium text-foreground">
                  Name on Plaque <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="plaque-name-input"
                  type="text"
                  placeholder="Enter name to appear on plaque"
                  value={plaqueName}
                  onChange={(e) => setPlaqueName(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This name will be displayed on the water pump plaque
                </p>
              </div>
            )}

            {/* Intention (Donation Type) */}
            <div className="space-y-2">
              <Label htmlFor="intention-select" className="text-sm font-medium text-foreground">
                Donation Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedIntention}
                onValueChange={(value) => {
                  if (isDonationType(value)) setSelectedIntention(value)
                }}
              >
                <SelectTrigger id="intention-select" className="h-11">
                  <SelectValue placeholder="Select donation type" />
                </SelectTrigger>
                <SelectContent>
                  {donationTypesEnabled.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "GENERAL" ? "General" : type === "SADAQAH" ? "Sadaqah" : type === "ZAKAT" ? "Zakat" : "Lillah"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Add to Donation Bag Button */}
            <Button
              onClick={handleAddToBag}
              size="lg"
              className="w-full h-11 mt-6 font-medium"
              disabled={
                (donationType === "appeal" && !selectedAppeal) ||
                (donationType === "water" && (!selectedWaterProject || !selectedWaterCountry)) ||
                !selectedIntention
              }
            >
              Add to Donation Bag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
