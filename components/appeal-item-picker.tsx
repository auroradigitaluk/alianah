"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSidecart } from "@/components/sidecart-provider"
import { DonationExpressCheckout, type DonationExpressItem } from "@/components/donation-express-checkout"
import { formatCurrency, formatEnum } from "@/lib/utils"
import { Minus, Plus, Check } from "lucide-react"

type DonationType = "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"

export type AppealItem = {
  productId: string
  name: string
  slug: string
  pricePence: number
}

/**
 * Fixed-price item picker (e.g. Winter Appeal). Pushes a normal one-off basket item
 * with productId/productName — the existing checkout, Stripe and receipts handle the rest.
 */
export function AppealItemPicker({
  appeal,
  items,
  donationTypesEnabled,
  initialItemSlug,
}: {
  appeal: { id: string; title: string }
  items: AppealItem[]
  donationTypesEnabled: string[]
  initialItemSlug?: string
}) {
  const { addItem } = useSidecart()
  const initial = items.find((i) => i.slug === initialItemSlug || i.slug.endsWith(`-${initialItemSlug}`)) ?? items[0]
  const [selectedId, setSelectedId] = React.useState(initial?.productId)
  const [qty, setQty] = React.useState(1)
  const types = (donationTypesEnabled.length ? donationTypesEnabled : ["GENERAL"]) as DonationType[]
  const [donationType, setDonationType] = React.useState<DonationType>(types.includes("GENERAL") ? "GENERAL" : types[0])
  const [walletAvailable, setWalletAvailable] = React.useState(false)
  const [added, setAdded] = React.useState(false)

  const selected = items.find((i) => i.productId === selectedId)
  const totalPence = selected ? selected.pricePence * qty : 0
  const productName = selected ? (qty > 1 ? `${selected.name} × ${qty}` : selected.name) : ""

  const expressItem: DonationExpressItem | null = selected
    ? {
        appealId: appeal.id,
        appealTitle: appeal.title,
        productId: selected.productId,
        productName,
        frequency: "ONE_OFF",
        donationType,
        amountPence: totalPence,
      }
    : null

  const handleAdd = () => {
    if (!selected) return
    addItem({
      id: "",
      appealId: appeal.id,
      appealTitle: appeal.title,
      productId: selected.productId,
      productName,
      frequency: "ONE_OFF",
      donationType,
      amountPence: totalPence,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Choose what to give</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((i) => {
            const isSel = i.productId === selectedId
            return (
              <button
                key={i.productId}
                type="button"
                onClick={() => setSelectedId(i.productId)}
                className={[
                  "flex items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors",
                  isSel ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                ].join(" ")}
              >
                <span className="text-sm font-medium">{i.name}</span>
                <span className="text-sm font-semibold">{formatCurrency(i.pricePence)}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-base">Quantity</Label>
          <div className="flex items-center gap-2">
            <Button type="button" size="icon" variant="outline" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
              <Minus className="h-4 w-4" />
            </Button>
            <input
              type="number"
              min={1}
              max={999}
              value={qty}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                setQty(Number.isFinite(n) ? Math.min(999, Math.max(1, n)) : 1)
              }}
              className="h-10 w-16 rounded-md border bg-background text-center"
            />
            <Button type="button" size="icon" variant="outline" onClick={() => setQty((q) => Math.min(999, q + 1))} aria-label="Increase">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {types.length > 1 && (
          <div className="space-y-2">
            <Label className="text-base">Donation Type *</Label>
            <Select value={donationType} onValueChange={(v) => setDonationType(v as DonationType)}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatEnum(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
          <span className="text-sm">{productName}</span>
          <span className="text-lg font-bold">{formatCurrency(totalPence)}</span>
        </div>

        <Button onClick={handleAdd} className="h-12 w-full text-base font-semibold" size="lg" disabled={!selected}>
          {added ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Added
            </>
          ) : (
            "Add to Basket"
          )}
        </Button>

        {expressItem && totalPence > 0 && (
          <div className="space-y-2">
            {walletAvailable && <p className="text-sm text-muted-foreground">Or pay with</p>}
            <DonationExpressCheckout item={expressItem} amountPence={totalPence} onWalletAvailable={setWalletAvailable} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
