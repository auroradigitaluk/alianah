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
import { DonationExpressCheckout, type DonationExpressItem } from "@/components/donation-express-checkout"
import { cn } from "@/lib/utils"
import {
  WaterPumpIcon,
  WaterTankIcon,
  WaterWellIcon,
  WudhuHandsIcon,
} from "@/components/icons/water-project-icons"

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
  plaqueAvailable: boolean
}

interface WaterProjectCountry {
  id: string
  projectType: string
  country: string
  pricePence: number
}

interface SponsorshipProject {
  id: string
  projectType: string // ORPHANS | HIFZ | FAMILIES
  location: string | null
  description: string | null
}

interface SponsorshipProjectCountry {
  id: string
  projectType: string
  country: string
  pricePence: number
  yearlyPricePence?: number | null
}

interface OneNationDonationFormProps {
  appeals: Appeal[]
  products?: AppealProduct[]
  donationTypesEnabled: string[]
  waterProjects?: WaterProject[]
  waterProjectCountries?: WaterProjectCountry[]
  sponsorshipProjects?: SponsorshipProject[]
  sponsorshipProjectCountries?: SponsorshipProjectCountry[]
  /** Pre-fill for Zakat calculator: amount in pence, sets intention to ZAKAT and custom amount */
  initialZakatPence?: number
  /** When true, hide Appeals/Water/Sponsors toggle and show appeal form only (e.g. Zakat page) */
  hideDonationTypeToggle?: boolean
  /** When set (e.g. from Zakat calculator), force one-off, lock amount to this value (pence), non-editable */
  zakatFixedAmountPence?: number
}


export function OneNationDonationForm({
  appeals,
  products = [],
  donationTypesEnabled,
  waterProjects = [],
  waterProjectCountries = [],
  sponsorshipProjects = [],
  sponsorshipProjectCountries = [],
  initialZakatPence,
  hideDonationTypeToggle = false,
  zakatFixedAmountPence,
}: OneNationDonationFormProps) {
  const { addItem } = useSidecart()

  const [frequency, setFrequency] = React.useState<"ONE_OFF" | "MONTHLY">("ONE_OFF")
  const [donationType, setDonationType] = React.useState<"appeal" | "water" | "sponsorship">("appeal")
  const [selectedAppeal, setSelectedAppeal] = React.useState<string>("")
  const [selectedWaterProject, setSelectedWaterProject] = React.useState<string>("")
  const [selectedSponsorshipType, setSelectedSponsorshipType] = React.useState<string>("")
  const [selectedSponsorshipCountry, setSelectedSponsorshipCountry] = React.useState<string>("")
  const [sponsorshipFrequency, setSponsorshipFrequency] = React.useState<"MONTHLY" | "YEARLY">("MONTHLY")
  const [selectedIntention, setSelectedIntention] = React.useState<DonationType | "">(
    donationTypesEnabled.includes("GENERAL") ? "GENERAL" : ((donationTypesEnabled[0] as DonationType) ?? "")
  )
  const [selectedWaterCountry, setSelectedWaterCountry] = React.useState<string>("")
  const [customAmount, setCustomAmount] = React.useState<string>("")
  const [selectedProduct, setSelectedProduct] = React.useState<string>("")
  const [plaqueName, setPlaqueName] = React.useState<string>("")
  const [walletAvailable, setWalletAvailable] = React.useState(false)

  // Pre-fill from Zakat calculator link (?zakatPence=...); only on mount when value is present
  const hasAppliedInitialZakat = React.useRef(false)
  React.useEffect(() => {
    if (hasAppliedInitialZakat.current || initialZakatPence == null || initialZakatPence <= 0) return
    hasAppliedInitialZakat.current = true
    setDonationType("appeal")
    setFrequency("ONE_OFF")
    setSelectedIntention("ZAKAT")
    setCustomAmount((initialZakatPence / 100).toFixed(2))
    if (appeals.length > 0) setSelectedAppeal(appeals[0].id)
  }, [initialZakatPence, appeals])

  // When only one donation type (e.g. Zakat-only form), set it and keep in sync
  React.useEffect(() => {
    if (donationTypesEnabled.length === 1 && isDonationType(donationTypesEnabled[0])) {
      setSelectedIntention(donationTypesEnabled[0])
    }
  }, [donationTypesEnabled])

  // Zakat fixed amount: force one-off and lock amount
  React.useEffect(() => {
    if (zakatFixedAmountPence != null && zakatFixedAmountPence > 0) {
      setFrequency("ONE_OFF")
      setCustomAmount((zakatFixedAmountPence / 100).toFixed(2))
    }
  }, [zakatFixedAmountPence])

  // Get selected appeal or water project data
  const appealData = appeals.find((a) => a.id === selectedAppeal)
  // `selectedWaterProject` stores the projectType, not the DB id
  const waterProjectData = waterProjects.find((p) => p.projectType === selectedWaterProject)
  const sponsorshipProjectData = sponsorshipProjects.find((p) => p.projectType === selectedSponsorshipType)
  
  // Get available products for selected appeal and frequency
  const availableProducts = selectedAppeal && donationType === "appeal"
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
    ? ((): number[] => {
        try {
          const arr: unknown = JSON.parse(selectedProductData.presetAmountsPence)
          if (!Array.isArray(arr)) return []
          return arr
            .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
            .sort((a, b) => a - b)
        } catch {
          return []
        }
      })()
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
        .sort((a, b) => a.amountPence - b.amountPence)
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
    ? waterProjectCountries
        .filter((c) => c.projectType === selectedWaterProject)
        .slice()
        .sort((a, b) => {
          if (a.pricePence !== b.pricePence) return a.pricePence - b.pricePence
          return a.country.localeCompare(b.country)
        })
    : []
  
  // Get selected water country data
  const selectedWaterCountryData = availableWaterCountries.find((c) => c.id === selectedWaterCountry)

  const availableSponsorshipCountries = selectedSponsorshipType
    ? sponsorshipProjectCountries
        .filter((c) => c.projectType === selectedSponsorshipType)
        .slice()
        .sort((a, b) => {
          if (a.pricePence !== b.pricePence) return a.pricePence - b.pricePence
          return a.country.localeCompare(b.country)
        })
    : []

  const selectedSponsorshipCountryData = availableSponsorshipCountries.find(
    (c) => c.id === selectedSponsorshipCountry
  )
  const sponsorshipHasYearly = availableSponsorshipCountries.some((c) => (c.yearlyPricePence || 0) > 0)

  React.useEffect(() => {
    if (!sponsorshipHasYearly && sponsorshipFrequency === "YEARLY") {
      queueMicrotask(() => setSponsorshipFrequency("MONTHLY"))
    }
  }, [sponsorshipHasYearly, sponsorshipFrequency])

  React.useEffect(() => {
    if (
      sponsorshipFrequency === "YEARLY" &&
      selectedSponsorshipCountryData &&
      !selectedSponsorshipCountryData.yearlyPricePence
    ) {
      queueMicrotask(() => setSponsorshipFrequency("MONTHLY"))
    }
  }, [selectedSponsorshipCountryData, sponsorshipFrequency])

  const availableSponsorshipTypes = ([
    { value: "ORPHANS", label: "Orphans" },
    { value: "HIFZ", label: "Hifz" },
    { value: "FAMILIES", label: "Families" },
  ] as const).filter((t) => {
    const hasProject = sponsorshipProjects.some((p) => p.projectType === t.value)
    const hasCountries = sponsorshipProjectCountries.some((c) => c.projectType === t.value)
    return hasProject && hasCountries
  })
  
  // Check if water project requires plaque name
  const requiresPlaqueName = !!waterProjectData?.plaqueAvailable

  // One-off express checkout (Apple Pay): same validation as Add to Bag, one-off only
  /* eslint-disable react-hooks/preserve-manual-memoization -- complex dependency array with stable object refs */
  const expressCheckout = React.useMemo((): { item: DonationExpressItem; amountPence: number } | null => {
    if (!selectedIntention) return null
    if (donationType === "water") {
      if (!selectedWaterProject || !selectedWaterCountry || !selectedWaterCountryData) return null
      if (requiresPlaqueName && !plaqueName.trim()) return null
      const projectTypeLabels: Record<string, string> = {
        WATER_PUMP: "Water Pump",
        WATER_WELL: "Water Well",
        WATER_TANK: "Water Tank",
        WUDHU_AREA: "Wudhu Area",
      }
      const title = waterProjectData?.location || projectTypeLabels[waterProjectData?.projectType || ""] || "Water Project"
      return {
        item: {
          appealTitle: title,
          frequency: "ONE_OFF",
          donationType: selectedIntention,
          amountPence: selectedWaterCountryData.pricePence,
          waterProjectId: waterProjectData?.id || "",
          waterProjectCountryId: selectedWaterCountry,
          ...(requiresPlaqueName && plaqueName.trim() ? { plaqueName: plaqueName.trim() } : {}),
        },
        amountPence: selectedWaterCountryData.pricePence,
      }
    }
    if (donationType === "sponsorship") {
      if (sponsorshipFrequency !== "YEARLY") return null // express only for one-off (yearly)
      if (!selectedSponsorshipType || !selectedSponsorshipCountry || !selectedSponsorshipCountryData) return null
      const yearlyPence = selectedSponsorshipCountryData.yearlyPricePence
      if (!yearlyPence) return null
      const labels: Record<string, string> = { ORPHANS: "Orphans", HIFZ: "Hifz", FAMILIES: "Families" }
      if (!sponsorshipProjectData?.id) return null
      return {
        item: {
          appealTitle: `Sponsorship - ${labels[sponsorshipProjectData.projectType] || sponsorshipProjectData.projectType}`,
          frequency: "ONE_OFF",
          donationType: selectedIntention,
          amountPence: yearlyPence,
          sponsorshipProjectId: sponsorshipProjectData.id,
          sponsorshipCountryId: selectedSponsorshipCountry,
          sponsorshipProjectType: sponsorshipProjectData.projectType,
          productName: `${selectedSponsorshipCountryData?.country ?? ""} (Yearly)`,
        },
        amountPence: yearlyPence,
      }
    }
    // appeal
    if (frequency !== "ONE_OFF") return null
    if (!selectedAppeal || !appealData) return null
    let amountPence = 0
    let productId: string | undefined
    let productName: string | undefined
    if (selectedProduct && selectedProductData) {
      productId = selectedProductData.productId
      productName = selectedProductData.product.name
      if (selectedProductData.product.fixedAmountPence) {
        amountPence = selectedProductData.product.fixedAmountPence
      } else if (productPresetAmounts.length > 0 && !productAllowsCustom) {
        if (monthlyPresetAmount) amountPence = Math.round(monthlyPresetAmount * 100)
        else return null
      } else if (customAmount) {
        const amount = parseFloat(customAmount)
        if (isNaN(amount) || amount <= 0) return null
        amountPence = Math.round(amount * 100)
      } else return null
    } else {
      if (zakatFixedAmountPence != null && zakatFixedAmountPence > 0) {
        amountPence = zakatFixedAmountPence
      } else if (customAmount) {
        const amount = parseFloat(customAmount)
        if (isNaN(amount) || amount <= 0) return null
        amountPence = Math.round(amount * 100)
      } else return null
    }
    if (amountPence <= 0) return null
    return {
      item: {
        appealId: selectedAppeal,
        appealTitle: appealData.title,
        productId,
        productName,
        frequency: "ONE_OFF",
        donationType: selectedIntention,
        amountPence,
      },
      amountPence,
    }
  }, [
    donationType,
    frequency,
    selectedAppeal,
    appealData,
    selectedIntention,
    selectedWaterProject,
    selectedWaterCountry,
    selectedWaterCountryData,
    waterProjectData,
    requiresPlaqueName,
    plaqueName,
    sponsorshipFrequency,
    selectedSponsorshipType,
    selectedSponsorshipCountry,
    selectedSponsorshipCountryData,
    sponsorshipProjectData,
    selectedProduct,
    selectedProductData,
    productPresetAmounts,
    productAllowsCustom,
    monthlyPresetAmount,
    customAmount,
    appealPresets.length,
    zakatFixedAmountPence,
  ])
  /* eslint-enable react-hooks/preserve-manual-memoization */

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

    if (donationType === "sponsorship" && !selectedSponsorshipType) {
      alert("Please select a sponsorship type")
      return
    }

    if (donationType === "sponsorship" && !selectedSponsorshipCountry) {
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
      // Water project donation - fixed price (no custom amounts)
      if (selectedWaterCountryData) {
        amountPence = selectedWaterCountryData.pricePence
      } else {
        alert("Please select a country")
        return
      }
    } else if (donationType === "sponsorship") {
      // Sponsorship donation - fixed price (no custom amounts)
      if (selectedSponsorshipCountryData) {
        if (sponsorshipFrequency === "YEARLY") {
          if (!selectedSponsorshipCountryData.yearlyPricePence) {
            alert("Yearly price not available for this country")
            return
          }
          amountPence = selectedSponsorshipCountryData.yearlyPricePence
        } else {
          amountPence = selectedSponsorshipCountryData.pricePence
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
      if (zakatFixedAmountPence != null && zakatFixedAmountPence > 0) {
        amountPence = zakatFixedAmountPence
      } else if (customAmount) {
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
      if (!waterProjectData?.id) {
        alert("Please select a water project")
        return
      }
      addItem({
        id: "",
        appealTitle: waterProjectData?.location || projectTypeLabels[waterProjectData?.projectType || ""] || "Water Project",
        frequency: "ONE_OFF",
        donationType: selectedIntention,
        amountPence,
        waterProjectId: waterProjectData?.id || "",
        waterProjectCountryId: selectedWaterCountry,
        plaqueName: requiresPlaqueName ? plaqueName : undefined,
      })
    } else if (donationType === "sponsorship") {
      const labels: Record<string, string> = {
        ORPHANS: "Orphans",
        HIFZ: "Hifz",
        FAMILIES: "Families",
      }
      if (!sponsorshipProjectData?.id) {
        alert("Please select a sponsorship type")
        return
      }
      addItem({
        id: "",
        appealTitle: `Sponsorship - ${labels[sponsorshipProjectData.projectType] || sponsorshipProjectData.projectType}`,
        frequency: sponsorshipFrequency === "YEARLY" ? "ONE_OFF" : "MONTHLY",
        donationType: selectedIntention,
        amountPence,
        sponsorshipProjectId: sponsorshipProjectData.id,
        sponsorshipCountryId: selectedSponsorshipCountry,
        sponsorshipProjectType: sponsorshipProjectData.projectType,
        productName:
          sponsorshipFrequency === "YEARLY"
            ? `${selectedSponsorshipCountryData?.country ?? ""} (Yearly)`
            : selectedSponsorshipCountryData?.country,
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
    setSelectedSponsorshipCountry("")
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Donation Form Card */}
      <Card className="!bg-transparent shadow-none hover:shadow-none">
        <CardHeader className="pb-4">
          <h2 className="text-xl font-semibold tracking-tight">Make a Donation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how you&apos;d like to give and where your donation will be used. Secure, fast, and impactful.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Donation Type Toggle (Appeal vs Water Project) */}
          {!hideDonationTypeToggle && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Donation Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => {
                  setDonationType("appeal")
                  setSelectedWaterProject("")
                  setSelectedWaterCountry("")
                  setCustomAmount("")
                  setSelectedSponsorshipType("")
                  setSelectedSponsorshipCountry("")
                }}
                variant={donationType === "appeal" ? "default" : "outline"}
                className={cn(
                  "flex-1 h-11 text-sm font-medium transition-all",
                  donationType === "appeal" && "shadow-sm"
                )}
              >
                Appeals
              </Button>
              {waterProjects.length > 0 && (
                <Button
                  type="button"
                  onClick={() => {
                    setDonationType("water")
                    setSelectedAppeal("")
                    setSelectedProduct("")
                    setCustomAmount("")
                    setSelectedSponsorshipType("")
                    setSelectedSponsorshipCountry("")
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
              <Button
                type="button"
                onClick={() => {
                  setDonationType("sponsorship")
                  setSelectedAppeal("")
                  setSelectedProduct("")
                  setSelectedWaterProject("")
                  setSelectedWaterCountry("")
                  setCustomAmount("")
                  setSelectedSponsorshipCountry("")
                }}
                variant={donationType === "sponsorship" ? "default" : "outline"}
                className={cn(
                  "flex-1 h-11 text-sm font-medium transition-all",
                  donationType === "sponsorship" && "shadow-sm"
                )}
              >
                Sponsors
              </Button>
            </div>
          </div>
          )}

          {/* Frequency Toggle (only for appeals; hidden when Zakat fixed amount) */}
          {donationType === "appeal" && zakatFixedAmountPence == null && (
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
                  Select Project
                </Label>
                <Select
                  value={selectedAppeal}
                  onValueChange={(value) => {
                    setSelectedAppeal(value)
                    setSelectedProduct("")
                  }}
                >
                  <SelectTrigger id="project-select" className="h-11 w-full data-[size=default]:h-11">
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
            ) : donationType === "water" ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Select Water Project
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full place-items-stretch">
                  {([
                    { value: "WATER_PUMP", label: "Water Pumps", Icon: WaterPumpIcon },
                    { value: "WATER_WELL", label: "Water Wells", Icon: WaterWellIcon },
                    { value: "WATER_TANK", label: "Water Tanks", Icon: WaterTankIcon },
                    { value: "WUDHU_AREA", label: "Wudhu Areas", Icon: WudhuHandsIcon },
                  ] as const).map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setSelectedWaterProject(t.value)
                        setSelectedWaterCountry("")
                        setPlaqueName("")
                      }}
                      variant={selectedWaterProject === t.value ? "default" : "outline"}
                      className={cn(
                        "w-full h-14 justify-center px-3",
                        selectedWaterProject === t.value && "shadow-sm"
                      )}
                    >
                      <t.Icon className="h-5 w-5 mr-2 shrink-0" />
                      <span className="text-sm font-medium text-center leading-tight">{t.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Select Sponsorship Type</Label>
                  <div className="grid grid-cols-3 gap-2 w-full place-items-stretch">
                    {availableSponsorshipTypes.map((t) => (
                      <Button
                        key={t.value}
                        type="button"
                        onClick={() => {
                          setSelectedSponsorshipType(t.value)
                          setSelectedSponsorshipCountry("")
                        }}
                        variant={selectedSponsorshipType === t.value ? "default" : "outline"}
                        className={cn(
                          "w-full h-11 justify-center",
                          selectedSponsorshipType === t.value && "shadow-sm"
                        )}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedSponsorshipType && availableSponsorshipCountries.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Select Country</Label>
                    <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
                      {availableSponsorshipCountries.map((country) => {
                        const yearlyAvailable = !!country.yearlyPricePence && country.yearlyPricePence > 0
                        const isYearly = sponsorshipFrequency === "YEARLY"
                        const isDisabled = isYearly && !yearlyAvailable
                        const displayPrice = isYearly
                          ? country.yearlyPricePence || country.pricePence
                          : country.pricePence
                        const isSelected = selectedSponsorshipCountry === country.id
                        return (
                          <Button
                            key={country.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => !isDisabled && setSelectedSponsorshipCountry(country.id)}
                            disabled={isDisabled}
                            className={cn(
                              "group w-full h-16 flex-col items-center justify-center px-3 py-2.5 text-center",
                              isSelected && "shadow-sm"
                            )}
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

                {selectedSponsorshipType && sponsorshipHasYearly && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Sponsorship Length</Label>
                    <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
                      <Button
                        type="button"
                        variant={sponsorshipFrequency === "MONTHLY" ? "default" : "outline"}
                        onClick={() => setSponsorshipFrequency("MONTHLY")}
                        className={cn(
                          "w-full h-11 justify-center",
                          sponsorshipFrequency === "MONTHLY" && "shadow-sm"
                        )}
                      >
                        Monthly
                      </Button>
                      <Button
                        type="button"
                        variant={sponsorshipFrequency === "YEARLY" ? "default" : "outline"}
                        onClick={() => setSponsorshipFrequency("YEARLY")}
                        className={cn(
                          "w-full h-11 justify-center",
                          sponsorshipFrequency === "YEARLY" && "shadow-sm"
                        )}
                      >
                        Yearly (one-off)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Water Project Country Selection */}
            {donationType === "water" && selectedWaterProject && availableWaterCountries.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Select Country
                </Label>
                <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
                  {availableWaterCountries.map((country) => {
                    const isSelected = selectedWaterCountry === country.id
                    return (
                      <Button
                        key={country.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setSelectedWaterCountry(country.id)}
                        className={cn(
                          "group w-full h-16 flex-col items-center justify-center px-3 py-2.5 text-center",
                          isSelected && "shadow-sm"
                        )}
                      >
                        <span className="text-sm font-medium leading-tight">
                          {country.country}
                        </span>
                        <span className="text-base font-semibold leading-tight">
                          £{(country.pricePence / 100).toFixed(2)}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Product Selection (if appeal selected and products available); hidden when Zakat fixed amount */}
            {donationType === "appeal" && selectedAppeal && availableProducts.length > 0 && zakatFixedAmountPence == null && (
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
                  Select Amount
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

            {/* Appeal Preset Amounts (direct donation); hidden when Zakat fixed amount */}
            {donationType === "appeal" && selectedAppeal && (!selectedProduct || productAllowsCustom) && appealPresets.length > 0 && zakatFixedAmountPence == null && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Suggested Amounts
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {appealPresets.map((preset) => {
                    const isSelected = customAmount === (preset.amountPence / 100).toString()
                    return (
                      <Button
                        key={preset.amountPence}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setCustomAmount((preset.amountPence / 100).toString())}
                        className={preset.label ? "group h-auto py-2.5" : "group h-11"}
                      >
                        <span className="flex flex-col items-center leading-tight">
                          <span className="group-hover:text-white">
                            £{(preset.amountPence / 100).toFixed(2)}{frequency === "MONTHLY" ? "/month" : ""}
                          </span>
                          {preset.label && (
                            <span
                              className={[
                                "text-[11px] font-medium mt-0.5 leading-tight tracking-tight line-clamp-3 text-center whitespace-normal group-hover:text-white",
                                isSelected ? "text-primary-foreground/90" : "text-foreground/80",
                              ].join(" ")}
                            >
                              {preset.label}
                            </span>
                          )}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Amount: fixed (Zakat) or editable */}
            {(donationType === "appeal" && (!selectedProduct || productAllowsCustom)) && (
              <div className="space-y-2">
                <Label htmlFor="amount-input" className="text-sm font-medium text-foreground">
                  Amount
                </Label>
                {zakatFixedAmountPence != null && zakatFixedAmountPence > 0 ? (
                  <div className="flex h-11 items-center rounded-md border border-input bg-muted/50 px-3 text-base font-medium">
                    £{(zakatFixedAmountPence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                        £
                      </span>
                      <Input
                        id="amount-input"
                        type="number"
                        placeholder={
                          donationType === "appeal" && appealPresets.length > 0
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
                  </>
                )}
              </div>
            )}

            {/* Plaque Name Field (for water pumps) */}
            {requiresPlaqueName && selectedWaterProject && (
              <div className="space-y-2">
                <Label htmlFor="plaque-name-input" className="text-sm font-medium text-foreground">
                  Name on Plaque
                </Label>
                <Input
                  id="plaque-name-input"
                  transform="titleCase"
                  type="text"
                  placeholder="Enter name to appear on plaque"
                  value={plaqueName}
                  onChange={(e) => setPlaqueName(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This name will be displayed on the project plaque
                </p>
              </div>
            )}

            {/* Intention (Donation Type) - hide when only one type (e.g. Zakat-only) */}
            {donationTypesEnabled.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="intention-select" className="text-sm font-medium text-foreground">
                Donation Type
              </Label>
              <Select
                value={selectedIntention}
                onValueChange={(value) => {
                  if (isDonationType(value)) setSelectedIntention(value)
                }}
              >
                <SelectTrigger id="intention-select" className="h-11 w-full">
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
            )}

            {/* Add to Donation Bag Button */}
            <Button
              onClick={handleAddToBag}
              size="lg"
              className="w-full h-11 mt-6 font-medium"
              disabled={
                (donationType === "appeal" && !selectedAppeal) ||
                (donationType === "water" && (!selectedWaterProject || !selectedWaterCountry)) ||
                (donationType === "sponsorship" && (!selectedSponsorshipType || !selectedSponsorshipCountry)) ||
                !selectedIntention
              }
            >
              Add to Donation Bag
            </Button>

            {/* Apple Pay / Google Pay for one-off (no cart, no duplicate orders) */}
            {expressCheckout && (
              <div className="space-y-2 mt-4">
                {walletAvailable && (
                  <p className="text-sm text-muted-foreground">Or pay with</p>
                )}
                <DonationExpressCheckout
                  item={expressCheckout.item}
                  amountPence={expressCheckout.amountPence}
                  onWalletAvailable={setWalletAvailable}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
