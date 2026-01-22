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

interface Appeal {
  id: string
  title: string
  slug: string
  allowMonthly: boolean
  allowYearly: boolean
  monthlyPricePence: number | null
  yearlyPricePence: number | null
}

interface Product {
  id: string
  name: string
  type: string
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

interface OneNationDonationFormProps {
  appeals: Appeal[]
  products: AppealProduct[]
  donationTypesEnabled: string[]
  locations?: string[] // Optional locations list
}


export function OneNationDonationForm({
  appeals,
  products,
  donationTypesEnabled,
  locations = [],
}: OneNationDonationFormProps) {
  const { addItem } = useSidecart()

  const [frequency, setFrequency] = React.useState<"ONE_OFF" | "MONTHLY">("ONE_OFF")
  const [selectedAppeal, setSelectedAppeal] = React.useState<string>("")
  const [selectedIntention, setSelectedIntention] = React.useState<string>("")
  const [selectedLocation, setSelectedLocation] = React.useState<string>("")
  const [customAmount, setCustomAmount] = React.useState<string>("")
  const [selectedProduct, setSelectedProduct] = React.useState<string>("")

  // Get selected appeal data
  const appealData = appeals.find((a) => a.id === selectedAppeal)
  
  // Get available products for selected appeal and frequency
  const availableProducts = selectedAppeal
    ? products.filter((p) => p.frequency === frequency)
    : []

  // Get preset amount for monthly from appeal
  const monthlyPresetAmount = appealData?.monthlyPricePence
    ? appealData.monthlyPricePence / 100
    : null

  const handleAddToBag = () => {
    if (!selectedAppeal) {
      alert("Please select a project")
      return
    }

    if (!selectedIntention) {
      alert("Please select an intention")
      return
    }

    let amountPence = 0
    let productId: string | undefined
    let productName: string | undefined

    if (selectedProduct) {
      const productData = availableProducts.find((p) => p.productId === selectedProduct)
      if (productData) {
        productId = productData.productId
        productName = productData.product.name
        
        if (productData.product.fixedAmountPence) {
          amountPence = productData.product.fixedAmountPence
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
      }
    } else {
      // Direct donation to appeal
      if (frequency === "MONTHLY" && monthlyPresetAmount) {
        amountPence = Math.round(monthlyPresetAmount * 100)
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
    }

    addItem({
      id: "",
      appealId: selectedAppeal,
      appealTitle: appealData?.title || "",
      productId,
      productName,
      frequency: frequency === "ONE_OFF" ? "ONE_OFF" : "MONTHLY",
      donationType: selectedIntention as any,
      amountPence,
    })

    // Reset form
    setCustomAmount("")
    setSelectedProduct("")
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
          {/* Frequency Toggle */}
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
                className={cn(
                  "flex-1 h-11 text-sm font-medium transition-all",
                  frequency === "MONTHLY" && "shadow-sm"
                )}
              >
                Monthly
              </Button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Select Project */}
            <div className="space-y-2">
              <Label htmlFor="project-select" className="text-sm font-medium text-foreground">
                Select Project <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedAppeal} onValueChange={setSelectedAppeal}>
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

            {/* Product Selection (if appeal selected and products available) */}
            {selectedAppeal && availableProducts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="product-select" className="text-sm font-medium text-foreground">
                  Select Product <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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

            {/* Amount Input (if no product selected or product allows custom) */}
            {(!selectedProduct || availableProducts.find((p) => p.productId === selectedProduct)?.allowCustom) && (
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
                    placeholder={frequency === "MONTHLY" && monthlyPresetAmount ? monthlyPresetAmount.toString() : "Enter amount"}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min="1"
                    step="0.01"
                    className="h-11 pl-7"
                  />
                </div>
                {frequency === "MONTHLY" && monthlyPresetAmount && !selectedProduct && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Suggested monthly amount: £{monthlyPresetAmount.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Intention (Donation Type) */}
            <div className="space-y-2">
              <Label htmlFor="intention-select" className="text-sm font-medium text-foreground">
                Donation Type <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedIntention} onValueChange={setSelectedIntention}>
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

            {/* Location (if locations available) */}
            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="location-select" className="text-sm font-medium text-foreground">
                  Location <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger id="location-select" className="h-11">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
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
              disabled={!selectedAppeal || !selectedIntention}
            >
              Add to Donation Bag
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
