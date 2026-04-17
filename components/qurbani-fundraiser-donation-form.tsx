"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { useSidecart } from "@/components/sidecart-provider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DonationExpressCheckout, type DonationExpressItem } from "@/components/donation-express-checkout"

type QurbaniSize = "ONE_SEVENTH" | "SMALL" | "LARGE"

const DONATION_TYPES = [
  { value: "GENERAL", label: "General Donation" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
] as const

interface QurbaniFundraiserDonationFormProps {
  fundraiserId: string
  country: {
    id: string
    country: string
    priceOneSeventhPence: number | null
    priceSmallPence: number | null
    priceLargePence: number | null
    labelOneSeventh: string | null
    labelSmall: string | null
    labelLarge: string | null
  }
}

const SIZE_KEYS: { key: QurbaniSize; label: string }[] = [
  { key: "ONE_SEVENTH", label: "1/7th" },
  { key: "SMALL", label: "Small" },
  { key: "LARGE", label: "Large" },
]

function getPrice(country: QurbaniFundraiserDonationFormProps["country"], size: QurbaniSize): number | null {
  if (size === "ONE_SEVENTH") return country.priceOneSeventhPence
  if (size === "SMALL") return country.priceSmallPence
  return country.priceLargePence
}

function getLabel(country: QurbaniFundraiserDonationFormProps["country"], size: QurbaniSize): string {
  if (size === "ONE_SEVENTH") return country.labelOneSeventh?.trim() || "1/7th"
  if (size === "SMALL") return country.labelSmall?.trim() || "Small"
  return country.labelLarge?.trim() || "Large"
}

export function QurbaniFundraiserDonationForm({ fundraiserId, country }: QurbaniFundraiserDonationFormProps) {
  const { addItem } = useSidecart()
  const [donationType, setDonationType] = useState<"GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH">("GENERAL")
  const [selectedSize, setSelectedSize] = useState<QurbaniSize | null>(null)
  const [qurbaniNames, setQurbaniNames] = useState("")
  const [walletAvailable, setWalletAvailable] = useState(false)

  const expressItem = useMemo((): { item: DonationExpressItem; amountPence: number } | null => {
    if (!selectedSize) return null
    const pricePence = getPrice(country, selectedSize)
    if (pricePence == null || pricePence <= 0) return null
    const sizeLabel = getLabel(country, selectedSize)
    return {
      item: {
        appealTitle: "Qurbani",
        fundraiserId,
        productName: `${country.country} - ${sizeLabel}`,
        frequency: "ONE_OFF",
        donationType,
        amountPence: pricePence,
        qurbaniCountryId: country.id,
        qurbaniSize: selectedSize,
        qurbaniNames: qurbaniNames.trim() || undefined,
      },
      amountPence: pricePence,
    }
  }, [country, donationType, fundraiserId, qurbaniNames, selectedSize])

  const handleAddToBasket = () => {
    if (!selectedSize) {
      toast.error("Please select a qurbani option")
      return
    }
    const pricePence = getPrice(country, selectedSize)
    if (pricePence == null || pricePence <= 0) {
      toast.error("This option is not available")
      return
    }

    addItem({
      id: "",
      appealTitle: "Qurbani",
      fundraiserId,
      productName: `${country.country} - ${getLabel(country, selectedSize)}`,
      frequency: "ONE_OFF",
      donationType,
      amountPence: pricePence,
      qurbaniCountryId: country.id,
      qurbaniSize: selectedSize,
      qurbaniNames: qurbaniNames.trim() || undefined,
    })
    setSelectedSize(null)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Qurbani Country</Label>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium">{country.country}</div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Select Option</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full place-items-stretch">
          {SIZE_KEYS.map(({ key, label }) => {
            const pricePence = getPrice(country, key)
            const sizeLabel = getLabel(country, key)
            const available = pricePence != null && pricePence > 0
            const isSelected = selectedSize === key
            return (
              <Button
                key={key}
                type="button"
                variant={isSelected ? "default" : "outline"}
                onClick={() => available && setSelectedSize(key)}
                disabled={!available}
                className={cn(
                  "w-full h-20 sm:h-24 flex-col items-center justify-center px-4 py-3 text-center gap-1.5",
                  isSelected && "shadow-sm"
                )}
              >
                <span className="text-base font-medium leading-snug">
                  {label}
                  {sizeLabel !== label && (
                    <span className={cn("block text-sm font-normal mt-0.5", isSelected ? "text-primary-foreground" : "text-muted-foreground")}>
                      {sizeLabel}
                    </span>
                  )}
                </span>
                <span className="text-lg font-semibold tabular-nums leading-none">
                  {available ? formatCurrency(pricePence) : "—"}
                </span>
              </Button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qurbani-fundraiser-names" className="text-sm font-medium text-foreground">
          Whose name is this Qurbani for?
        </Label>
        <Input
          id="qurbani-fundraiser-names"
          type="text"
          placeholder="e.g. Ahmed Khan, or leave blank"
          value={qurbaniNames}
          onChange={(e) => setQurbaniNames(e.target.value)}
          transform="titleCase"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Donation Type</Label>
        <Select value={donationType} onValueChange={(v) => setDonationType(v as typeof donationType)}>
          <SelectTrigger className="!h-11 w-full min-h-11 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DONATION_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" className="w-full h-11" onClick={handleAddToBasket} disabled={!selectedSize}>
        Add to basket
      </Button>

      {expressItem && (
        <div className="space-y-2 mt-4">
          {walletAvailable && <p className="text-sm text-muted-foreground">Or pay with</p>}
          <DonationExpressCheckout
            item={expressItem.item}
            amountPence={expressItem.amountPence}
            onWalletAvailable={setWalletAvailable}
          />
        </div>
      )}
    </div>
  )
}
