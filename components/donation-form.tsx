"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useSidecart } from "@/components/sidecart-provider"
import { formatCurrency, formatEnum } from "@/lib/utils"

interface AppealProduct {
  productId: string
  frequency: string
  presetAmountsPence: string
  allowCustom: boolean
  product: {
    id: string
    name: string
    type: string
    fixedAmountPence: number | null
    minAmountPence: number | null
    maxAmountPence: number | null
  }
}

interface DonationFormProps {
  appeal: {
    id: string
    title: string
    allowMonthly: boolean
    allowYearly: boolean
    monthlyPricePence: number | null
    yearlyPricePence: number | null
  }
  products: AppealProduct[]
  donationTypesEnabled: string[]
  initialFrequency?: "ONE_OFF" | "MONTHLY" | "YEARLY"
  initialPreset?: number
  initialDonationType?: "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
  fundraiserId?: string
  noCard?: boolean
}

export function DonationForm({
  appeal,
  products,
  donationTypesEnabled,
  initialFrequency,
  initialPreset,
  initialDonationType,
  fundraiserId,
  noCard = false,
}: DonationFormProps) {
  const { addItem } = useSidecart()

  const [frequency, setFrequency] = React.useState<"ONE_OFF" | "MONTHLY" | "YEARLY">(
    initialFrequency || "ONE_OFF"
  )
  const [donationType, setDonationType] = React.useState<string>(
    initialDonationType && donationTypesEnabled.includes(initialDonationType)
      ? initialDonationType
      : "GENERAL"
  )
  const [selectedProduct, setSelectedProduct] = React.useState<string | null>(null)
  const [customAmount, setCustomAmount] = React.useState<string>(
    initialPreset ? (initialPreset / 100).toString() : ""
  )
  const [presetAmount, setPresetAmount] = React.useState<number | null>(
    initialPreset || null
  )

  // Set initial values from URL params on mount
  React.useEffect(() => {
    if (initialFrequency) {
      setFrequency(initialFrequency)
    }
    if (initialDonationType && donationTypesEnabled.includes(initialDonationType)) {
      setDonationType(initialDonationType)
    }
    if (initialPreset) {
      const presetInPounds = initialPreset / 100
      setCustomAmount(presetInPounds.toString())
    }
  }, []) // Only run on mount

  const availableProducts = products.filter((p) => p.frequency === frequency)
  const selectedProductData = availableProducts.find((p) => p.productId === selectedProduct)

  // Get preset amount for monthly/yearly from appeal
  const getAppealPresetAmount = (): number | null => {
    if (frequency === "MONTHLY" && appeal.monthlyPricePence) {
      return appeal.monthlyPricePence
    }
    if (frequency === "YEARLY" && appeal.yearlyPricePence) {
      return appeal.yearlyPricePence
    }
    return null
  }

  const appealPresetAmount = getAppealPresetAmount()

  // Auto-select appeal preset amount when frequency changes
  React.useEffect(() => {
    if (appealPresetAmount && !selectedProduct) {
      setPresetAmount(appealPresetAmount)
      setCustomAmount("")
    } else if (!appealPresetAmount && !selectedProduct && frequency !== "ONE_OFF") {
      setPresetAmount(null)
    }
  }, [frequency, appealPresetAmount, selectedProduct])

  const handleAddToBasket = () => {
    if (!donationType) {
      alert("Please select a donation type")
      return
    }

    let amountPence = 0
    let productId: string | undefined
    let productName: string | undefined

    if (selectedProduct && selectedProductData) {
      productId = selectedProductData.productId
      productName = selectedProductData.product.name

      if (presetAmount !== null) {
        amountPence = presetAmount
      } else if (customAmount) {
        const amount = parseFloat(customAmount)
        if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount")
          return
        }
        amountPence = Math.round(amount * 100)
      } else {
        alert("Please select or enter an amount")
        return
      }
    } else {
      // Direct donation to appeal
      if (presetAmount !== null) {
        amountPence = presetAmount
      } else if (customAmount) {
        const amount = parseFloat(customAmount)
        if (isNaN(amount) || amount <= 0) {
          alert("Please enter a valid amount")
          return
        }
        amountPence = Math.round(amount * 100)
      } else {
        alert("Please select or enter an amount")
        return
      }
    }

    addItem({
      id: "",
      appealId: appeal.id,
      appealTitle: appeal.title,
      fundraiserId: fundraiserId,
      productId,
      productName,
      frequency,
      donationType: donationType as any,
      amountPence,
    })

    // Reset form
    setPresetAmount(null)
    setCustomAmount("")
  }

  const presetAmounts = selectedProductData?.presetAmountsPence
    ? JSON.parse(selectedProductData.presetAmountsPence)
    : []

  const canUseCustom = selectedProductData?.allowCustom ?? false

  // Show preset button for appeal prices
  const showAppealPreset = appealPresetAmount && !selectedProduct

  const formFields = (
    <>
      {/* Product Selection (if available) */}
      {availableProducts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base">Product</Label>
          <Select value={selectedProduct || "none"} onValueChange={(value) => setSelectedProduct(value === "none" ? null : value)}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Direct Donation</SelectItem>
              {availableProducts.map((p) => (
                <SelectItem key={p.productId} value={p.productId}>
                  {p.product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Amount Selection */}
      <div className="space-y-2">
        <Label className="text-base">Amount</Label>
        {showAppealPreset && (
          <Button
            type="button"
            variant={presetAmount === appealPresetAmount ? "default" : "outline"}
            className="w-full h-11 text-base mb-2"
            onClick={() => {
              setPresetAmount(appealPresetAmount)
              setCustomAmount("")
            }}
          >
            {formatCurrency(appealPresetAmount)}
          </Button>
        )}
        {selectedProductData && presetAmounts.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {presetAmounts.map((amount: number) => (
              <Button
                key={amount}
                type="button"
                variant={presetAmount === amount ? "default" : "outline"}
                onClick={() => {
                  setPresetAmount(amount)
                  setCustomAmount("")
                }}
                className="h-11 text-base"
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>
        )}
        {((selectedProductData ? canUseCustom : true) && !showAppealPreset) && (
          <Input
            type="number"
            placeholder={selectedProductData ? "Enter custom amount" : "Enter amount"}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value)
              setPresetAmount(null)
            }}
            min="1"
            step="0.01"
            className="h-11 text-base"
          />
        )}
      </div>

      {/* Donation Type Selection */}
      <div className="space-y-2">
        <Label className="text-base">Donation Type *</Label>
        <Select value={donationType} onValueChange={setDonationType}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {donationTypesEnabled.map((type) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  <span>{formatEnum(type)}</span>
                  {type === "ZAKAT" && (
                    <Badge variant="outline" className="text-xs">
                      Zakat eligible
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add to Basket Button */}
      <Button
        onClick={handleAddToBasket}
        className="w-full h-12 text-base font-semibold"
        size="lg"
        disabled={!donationType || (!presetAmount && !customAmount)}
      >
        Add to Basket
      </Button>
    </>
  )

  if (noCard) {
    return <div className="space-y-6">{formFields}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Make a Donation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {formFields}
      </CardContent>
    </Card>
  )
}
