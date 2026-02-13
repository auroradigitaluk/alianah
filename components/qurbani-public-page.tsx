"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { useSidecart } from "@/components/sidecart-provider"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { DonationExpressCheckout, type DonationExpressItem } from "@/components/donation-express-checkout"
import { Input } from "@/components/ui/input"

const DONATION_TYPES = [
  { value: "GENERAL", label: "General Donation" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
] as const

type QurbaniSize = "ONE_SEVENTH" | "SMALL" | "LARGE"

interface QurbaniCountry {
  id: string
  country: string
  priceOneSeventhPence: number | null
  priceSmallPence: number | null
  priceLargePence: number | null
  labelOneSeventh: string | null
  labelSmall: string | null
  labelLarge: string | null
  isActive: boolean
  sortOrder: number
}

interface QurbaniPublicPageProps {
  countries: QurbaniCountry[]
}

const SIZE_KEYS: { key: QurbaniSize; label: string; priceKey: keyof QurbaniCountry; labelKey: keyof QurbaniCountry }[] = [
  { key: "ONE_SEVENTH", label: "1/7th", priceKey: "priceOneSeventhPence", labelKey: "labelOneSeventh" },
  { key: "SMALL", label: "Small", priceKey: "priceSmallPence", labelKey: "labelSmall" },
  { key: "LARGE", label: "Large", priceKey: "priceLargePence", labelKey: "labelLarge" },
]

function getPrice(country: QurbaniCountry, size: QurbaniSize): number | null {
  const row = SIZE_KEYS.find((r) => r.key === size)
  if (!row) return null
  const v = country[row.priceKey]
  return typeof v === "number" ? v : null
}

function getLabel(country: QurbaniCountry, size: QurbaniSize): string {
  const row = SIZE_KEYS.find((r) => r.key === size)
  if (!row) return size
  const label = country[row.labelKey]
  return (typeof label === "string" && label.trim()) ? label : row.label
}

export function QurbaniPublicPage({ countries }: QurbaniPublicPageProps) {
  const { addItem } = useSidecart()
  const [donationType, setDonationType] = useState<"GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH">("GENERAL")
  const [selectedCountryId, setSelectedCountryId] = useState<string>("")
  const [selectedSize, setSelectedSize] = useState<QurbaniSize | null>(null)
  const [qurbaniNames, setQurbaniNames] = useState("")
  const [walletAvailable, setWalletAvailable] = useState(false)

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === selectedCountryId) ?? null,
    [countries, selectedCountryId]
  )

  const expressItem = useMemo((): { item: DonationExpressItem; amountPence: number } | null => {
    if (!selectedCountry || !selectedSize) return null
    const pricePence = getPrice(selectedCountry, selectedSize)
    if (pricePence == null || pricePence <= 0) return null
    const sizeLabel = getLabel(selectedCountry, selectedSize)
    return {
      item: {
        appealTitle: "Qurbani",
        productName: `${selectedCountry.country} – ${sizeLabel}`,
        frequency: "ONE_OFF",
        donationType,
        amountPence: pricePence,
        qurbaniCountryId: selectedCountry.id,
        qurbaniSize: selectedSize,
        qurbaniNames: qurbaniNames.trim() || undefined,
      },
      amountPence: pricePence,
    }
  }, [selectedCountry, selectedSize, donationType, qurbaniNames])

  const handleAddToBasket = () => {
    if (!selectedCountry || !selectedSize) {
      toast.error("Please select a country and an option")
      return
    }
    const pricePence = getPrice(selectedCountry, selectedSize)
    if (pricePence == null || pricePence <= 0) {
      toast.error("This option is not available")
      return
    }
    const sizeLabel = getLabel(selectedCountry, selectedSize)
    addItem({
      id: "",
      appealTitle: "Qurbani",
      productName: `${selectedCountry.country} – ${sizeLabel}`,
      frequency: "ONE_OFF",
      donationType,
      amountPence: pricePence,
      qurbaniCountryId: selectedCountry.id,
      qurbaniSize: selectedSize,
      qurbaniNames: qurbaniNames.trim() || undefined,
    })
    toast.success("Added to basket")
    setSelectedSize(null)
  }

  if (countries.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Qurbani</h1>
        <p className="text-muted-foreground">No qurbani options are available at the moment. Please check back later.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:px-6 md:py-8 max-w-2xl">
        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight md:text-3xl mb-2">
            Qurbani Donations
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Choose a country and option. Your sacrifice will support those in need.
          </p>
        </div>

        <Card className="shadow-sm border">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold tracking-tight">Make a Qurbani Donation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select your country and the option you wish to donate. Secure and impactful.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Select Country</Label>
              <Select
                value={selectedCountryId}
                onValueChange={(id) => {
                  setSelectedCountryId(id)
                  setSelectedSize(null)
                }}
              >
                <SelectTrigger className="h-11 w-full" id="qurbani-country">
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCountry && (
              <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Select Option</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full place-items-stretch">
                  {SIZE_KEYS.map(({ key, label }) => {
                    const pricePence = getPrice(selectedCountry, key)
                    const sizeLabel = getLabel(selectedCountry, key)
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
                            <span className={cn(
                              "block text-sm font-normal mt-0.5",
                              isSelected ? "text-primary-foreground" : "text-muted-foreground"
                            )}>
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
                <Label htmlFor="qurbani-names" className="text-sm font-medium text-foreground">
                  Whose name is this Qurbani for?
                </Label>
                <Input
                  id="qurbani-names"
                  type="text"
                  placeholder="e.g. Ahmed Khan, or leave blank"
                  value={qurbaniNames}
                  onChange={(e) => setQurbaniNames(e.target.value)}
                  className="h-11"
                />
                {selectedSize === "ONE_SEVENTH" || selectedSize === "SMALL" ? (
                  <p className="text-xs text-muted-foreground">
                    Enter 1 name.
                  </p>
                ) : selectedSize === "LARGE" ? (
                  <p className="text-xs text-muted-foreground">
                    Add up to 7 names. Separate multiple names with a comma.
                  </p>
                ) : null}
              </div>
              </>
            )}

            {selectedCountryId && !selectedCountry && (
              <p className="text-sm text-muted-foreground">Country not found.</p>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Donation Type</Label>
              <Select value={donationType} onValueChange={(v) => setDonationType(v as typeof donationType)}>
                <SelectTrigger className="h-11 w-full">
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

            <Button
              type="button"
              className="w-full h-11"
              onClick={handleAddToBasket}
              disabled={!selectedCountry || !selectedSize}
            >
              Add to basket
            </Button>

            {expressItem && (
              <div className="space-y-2 mt-4">
                {walletAvailable && (
                  <p className="text-sm text-muted-foreground">Or pay with</p>
                )}
                <DonationExpressCheckout
                  item={expressItem.item}
                  amountPence={expressItem.amountPence}
                  onWalletAvailable={setWalletAvailable}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
