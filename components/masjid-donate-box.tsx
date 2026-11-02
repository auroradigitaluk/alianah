"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useSidecart } from "@/components/sidecart-provider"
import { formatCurrencyWhole } from "@/lib/utils"
import { MASJID_CONTRIBUTION_PRESETS_PENCE } from "@/lib/masjid-shared"

const DONATION_TYPES = [
  { value: "GENERAL", label: "General Donation" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
] as const

interface MasjidDonateBoxProps {
  appealId: string
  appealTitle: string
  country: string
  priceFromPence: number
  allowPartialDonations: boolean
}

export function MasjidDonateBox({
  appealId,
  appealTitle,
  country,
  priceFromPence,
  allowPartialDonations,
}: MasjidDonateBoxProps) {
  const { addItem } = useSidecart()
  const [donationType, setDonationType] = React.useState<(typeof DONATION_TYPES)[number]["value"]>("GENERAL")
  const [selectedPresetPence, setSelectedPresetPence] = React.useState<number | null>(null)
  const [customAmount, setCustomAmount] = React.useState("")

  function add(amountPence: number, productName: string) {
    try {
      addItem({
        id: "",
        appealId,
        appealTitle,
        productName,
        frequency: "ONE_OFF",
        donationType,
        amountPence,
      })
      toast.success("Added to basket")
    } catch {
      toast.error("Could not add to basket. Please try again.")
    }
  }

  function handleContribute() {
    const normalized = customAmount.trim().replace(",", ".")
    const customPence = normalized ? Math.round(parseFloat(normalized) * 100) : 0
    let amountPence: number
    if (selectedPresetPence != null && selectedPresetPence > 0) {
      amountPence = selectedPresetPence
    } else if (!Number.isNaN(customPence) && customPence >= 100) {
      amountPence = customPence
    } else {
      toast.error("Select an amount or enter at least £1")
      return
    }
    add(amountPence, `Contribution – ${country}`)
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Donation type</Label>
        <Select value={donationType} onValueChange={(v) => setDonationType(v as typeof donationType)}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DONATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        size="lg"
        className="h-14 w-full text-base font-semibold"
        onClick={() => add(priceFromPence, `Full Masjid – ${country}`)}
      >
        Donate a full Masjid — {formatCurrencyWhole(priceFromPence)}
      </Button>

      {allowPartialDonations && (
        <div className="space-y-3 rounded-lg border p-4">
          <Label>Or contribute any amount</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MASJID_CONTRIBUTION_PRESETS_PENCE.map((pence) => (
              <Button
                key={pence}
                type="button"
                variant={selectedPresetPence === pence ? "default" : "outline"}
                className="h-11"
                onClick={() => {
                  setSelectedPresetPence(pence)
                  setCustomAmount("")
                }}
              >
                {formatCurrencyWhole(pence)}
              </Button>
            ))}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-medium text-foreground">
              £
            </span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="1"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                if (e.target.value.trim()) setSelectedPresetPence(null)
              }}
              className="h-11 pl-7"
            />
          </div>
          <Button type="button" variant="secondary" className="h-11 w-full" onClick={handleContribute}>
            Add contribution to basket
          </Button>
        </div>
      )}
    </div>
  )
}
