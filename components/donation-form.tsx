"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useSidecart } from "@/components/sidecart-provider"
import { DonationExpressCheckout, type DonationExpressItem } from "@/components/donation-express-checkout"
import { formatCurrency, formatEnum } from "@/lib/utils"

type DonationType = "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
type Preset = { amountPence: number; label?: string }

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
    monthlyPricePence: number | null
    oneOffPresetAmountsPence?: string
    monthlyPresetAmountsPence?: string
  }
  products?: AppealProduct[]
  donationTypesEnabled: string[]
  initialFrequency?: "ONE_OFF" | "MONTHLY" | "YEARLY"
  initialPreset?: number
  initialDonationType?: "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
  fundraiserId?: string
  noCard?: boolean
}

export function DonationForm({
  appeal,
  products = [],
  donationTypesEnabled,
  initialFrequency,
  initialPreset,
  initialDonationType,
  fundraiserId,
  noCard = false,
}: DonationFormProps) {
  const { addItem } = useSidecart()

  const [frequency, setFrequency] = React.useState<"ONE_OFF" | "MONTHLY" | "YEARLY">(
    initialFrequency === "YEARLY" ? "ONE_OFF" : (initialFrequency || "ONE_OFF")
  )
  const isDonationType = (value: string): value is DonationType =>
    value === "GENERAL" || value === "SADAQAH" || value === "ZAKAT" || value === "LILLAH"

  const [donationType, setDonationType] = React.useState<DonationType>("GENERAL")
  const [selectedProduct, setSelectedProduct] = React.useState<string | null>(null)
  const [customAmount, setCustomAmount] = React.useState<string>(
    initialPreset ? (initialPreset / 100).toString() : ""
  )
  const [presetAmount, setPresetAmount] = React.useState<number | null>(
    initialPreset || null
  )
  const [isAnonymous, setIsAnonymous] = React.useState(false)
  const [walletAvailable, setWalletAvailable] = React.useState(false)

  // Set initial values from URL params on mount (donation type always defaults to General)
  React.useEffect(() => {
    if (initialFrequency) {
      setFrequency(initialFrequency)
    }
    if (initialPreset) {
      const presetInPounds = initialPreset / 100
      setCustomAmount(presetInPounds.toString())
    }
  }, []) // Only run on mount

  const availableProducts = products.filter((p) => p.frequency === frequency)
  const selectedProductData = availableProducts.find((p) => p.productId === selectedProduct)

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
    // Monthly: prefer preset arrays, fallback to single price if set
    if (frequency === "MONTHLY") {
      const monthly = parsePresetJson(appeal.monthlyPresetAmountsPence)
      if (monthly.length > 0) return monthly
      return appeal.monthlyPricePence ? [{ amountPence: appeal.monthlyPricePence }] : []
    }
    // ONE_OFF: use one-off preset list only
    return parsePresetJson(appeal.oneOffPresetAmountsPence)
  }

  const appealPresets = getAppealPresets()

  // Note: we intentionally do NOT auto-select presets for recurring donations.
  // Customers can always type any monthly/yearly amount, and presets are optional.

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
      donationType,
      amountPence,
      ...(fundraiserId ? { isAnonymous } : {}),
    })

    // Reset form
    setPresetAmount(null)
    setCustomAmount("")
  }

  const presetAmountsJson = selectedProductData?.presetAmountsPence ?? ""
  /* eslint-disable react-hooks/preserve-manual-memoization -- primitive dep from optional chain */
  const presetAmounts: number[] = React.useMemo(() => {
    if (!presetAmountsJson) return []
    try {
      const arr: unknown = JSON.parse(presetAmountsJson)
      if (!Array.isArray(arr)) return []
      return arr
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
    } catch {
      return []
    }
  }, [presetAmountsJson])
  /* eslint-enable react-hooks/preserve-manual-memoization */

  const canUseCustom = selectedProductData?.allowCustom ?? false

  const showAppealPresets = !selectedProduct && appealPresets.length > 0

  // One-off amount for express checkout (Apple Pay / Google Pay)
  const expressAmountPence =
    frequency === "ONE_OFF"
      ? presetAmount ?? (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0)
      : 0
  const hasValidExpressAmount = expressAmountPence > 0
  const expressItem: DonationExpressItem | null =
    frequency === "ONE_OFF" && hasValidExpressAmount && donationType
      ? {
          appealId: appeal.id,
          appealTitle: appeal.title,
          ...(fundraiserId ? { fundraiserId, isAnonymous } : {}),
          productId: selectedProductData?.productId,
          productName: selectedProductData?.product?.name,
          frequency: "ONE_OFF",
          donationType,
          amountPence: expressAmountPence,
        }
      : null

  const formFields = (
    <>
      {/* Frequency Selection (only if monthly is enabled) */}
      {appeal.allowMonthly && (
        <div className="space-y-2">
          <Label className="text-base">Frequency</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={frequency === "ONE_OFF" ? "default" : "outline"}
              className="h-11 text-base"
              onClick={() => setFrequency("ONE_OFF")}
            >
              One off
            </Button>
            <Button
              type="button"
              variant={frequency === "MONTHLY" ? "default" : "outline"}
              className="h-11 text-base"
              onClick={() => setFrequency("MONTHLY")}
            >
              Recurring
            </Button>
          </div>
          {frequency === "MONTHLY" && (
            <p className="text-sm text-muted-foreground">
              This is a monthly donation. Your payment method will be charged each month at checkout.
              Cancel anytime using the link in your email receipt.
            </p>
          )}
        </div>
      )}

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
        {showAppealPresets && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {appealPresets.map((preset) => {
              const isSelected = presetAmount === preset.amountPence
              return (
                <Button
                  key={preset.amountPence}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => {
                    setPresetAmount(preset.amountPence)
                    setCustomAmount("")
                  }}
                  className={preset.label ? "group h-auto py-2.5 text-base" : "group h-11 text-base"}
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span className="font-semibold group-hover:text-white">
                      {frequency === "MONTHLY"
                        ? `${formatCurrency(preset.amountPence)}/month`
                        : formatCurrency(preset.amountPence)}
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
        )}
        {selectedProductData && presetAmounts.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {presetAmounts.map((amount) => (
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
                {frequency === "MONTHLY" ? `${formatCurrency(amount)}/month` : formatCurrency(amount)}
              </Button>
            ))}
          </div>
        )}
        {((selectedProductData ? canUseCustom : true)) && (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-medium pointer-events-none">
              £
            </span>
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
              className="h-11 text-base pl-7"
            />
          </div>
        )}
      </div>

      {/* Donation Type Selection */}
      <div className="space-y-2">
        <Label className="text-base">Donation Type *</Label>
        <Select
          value={donationType}
          onValueChange={(value) => {
            if (isDonationType(value)) setDonationType(value)
          }}
        >
          <SelectTrigger className="h-11 w-full">
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

      {/* Add to Basket Button */}
      <Button
        onClick={handleAddToBasket}
        className="w-full h-12 text-base font-semibold"
        size="lg"
        disabled={!donationType || (!presetAmount && !customAmount)}
      >
        Add to Basket
      </Button>

      {/* Apple Pay / Google Pay for one-off (no cart, no duplicate orders) */}
      {expressItem && hasValidExpressAmount && (
        <div className="space-y-2">
          {walletAvailable && (
            <p className="text-sm text-muted-foreground">Or pay with</p>
          )}
          <DonationExpressCheckout
            item={expressItem}
            amountPence={expressAmountPence}
            onWalletAvailable={setWalletAvailable}
          />
        </div>
      )}
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
