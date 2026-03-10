"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Banknote, ChevronDown } from "lucide-react"

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
] as const

const DONATION_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
] as const

type Props = {
  fundraiserId: string
}

export function FundraiserPublicCashForm({ fundraiserId }: Props) {
  const [open, setOpen] = React.useState(false)
  const [amountPounds, setAmountPounds] = React.useState("")
  const [donorName, setDonorName] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "BANK_TRANSFER">("CASH")
  const [donationType, setDonationType] = React.useState<"GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH">("GENERAL")
  const [donorEmail, setDonorEmail] = React.useState("")
  const [donorPhone, setDonorPhone] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pounds = parseFloat(amountPounds)
    if (Number.isNaN(pounds) || pounds <= 0) {
      setStatus("error")
      setErrorMessage("Please enter a valid amount")
      return
    }
    const amountPence = Math.round(pounds * 100)
    setStatus("submitting")
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/fundraisers/${fundraiserId}/public-cash-donation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence,
          donorName: donorName.trim() || undefined,
          paymentMethod,
          donationType,
          donorEmail: donorEmail.trim() || undefined,
          donorPhone: donorPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error ?? "Failed to submit")
        return
      }
      setStatus("success")
      setAmountPounds("")
      setDonorName("")
      setPaymentMethod("CASH")
      setDonationType("GENERAL")
      setDonorEmail("")
      setDonorPhone("")
      setNotes("")
    } catch {
      setStatus("error")
      setErrorMessage("Something went wrong. Please try again.")
    }
  }

  if (!open) {
    return (
      <Card className="py-0 dark:border-border dark:bg-card">
        <CardContent className="p-0">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-12 gap-2 rounded-lg border-neutral-300 dark:border-input text-neutral-700 dark:text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary text-base"
            onClick={() => setOpen(true)}
          >
            <Banknote className="h-4 w-4 shrink-0" />
            <span className="text-sm sm:text-base">Want to Donate via Cash or Bank Transfer?</span>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="py-4 dark:border-border dark:bg-card">
      <CardContent className="px-6 py-2">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-base">Add offline donation</h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Want to give offline (e.g. cash, bank transfer, cheque)? Please give it to the fundraiser organiser - & they’ll pass it on to the Alianah team. Record your donation below so it can be added to the total once received.
        </p>
        {status === "success" ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Thank you. Your offline donation has been recorded and will be reviewed shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="public-cash-amount">Amount (£) *</Label>
                <Input
                  id="public-cash-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amountPounds}
                  onChange={(e) => setAmountPounds(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-cash-name">Name (optional)</Label>
                <Input
                  id="public-cash-name"
                  type="text"
                  placeholder="e.g. John"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                  disabled={status === "submitting"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Donation type</Label>
                <Select
                  value={donationType}
                  onValueChange={(v) => setDonationType(v as typeof donationType)}
                  disabled={status === "submitting"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="public-cash-email">Email (optional)</Label>
                <Input
                  id="public-cash-email"
                  type="email"
                  placeholder="you@example.com"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-cash-phone">Phone (optional)</Label>
                <Input
                  id="public-cash-phone"
                  type="tel"
                  placeholder="e.g. 07xxx xxxxxx"
                  value={donorPhone}
                  onChange={(e) => setDonorPhone(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="public-cash-notes">Notes (optional)</Label>
              <Textarea
                id="public-cash-notes"
                placeholder="e.g. Collection at work, reference number"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={status === "submitting"}
                className="resize-none"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={status === "submitting"}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={status === "submitting"}>
                {status === "submitting" ? "Submitting…" : "Record offline donation"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
