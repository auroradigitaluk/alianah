"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { formatCurrency, formatDate, formatEnum } from "@/lib/utils"
import type { FundraiserDonationRow } from "@/app/(public)/fundraiser/donations/page"
import { IconCircleCheckFilled, IconLoader, IconX } from "@tabler/icons-react"
import { Banknote } from "lucide-react"

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

export function FundraiserDonationsClient({
  donations,
  fundraisers,
  initialFundraiserId,
}: {
  donations: FundraiserDonationRow[]
  fundraisers: { id: string; title: string }[]
  initialFundraiserId?: string | null
}) {
  const router = useRouter()
  const [offlineOpen, setOfflineOpen] = useState(false)
  const validInitialId =
    initialFundraiserId && fundraisers.some((f) => f.id === initialFundraiserId)
      ? initialFundraiserId
      : null
  const defaultFundraiserId = validInitialId ?? fundraisers[0]?.id ?? ""
  const [fundraiserId, setFundraiserId] = useState(defaultFundraiserId)
  const [amountPounds, setAmountPounds] = useState("")
  const [donorName, setDonorName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH")
  const [donationType, setDonationType] = useState<"GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH">("GENERAL")
  const [donorEmail, setDonorEmail] = useState("")
  const [donorPhone, setDonorPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleOpenOffline = () => {
    setOfflineOpen(true)
    setFundraiserId(defaultFundraiserId)
    setAmountPounds("")
    setDonorName("")
    setPaymentMethod("CASH")
    setDonationType("GENERAL")
    setDonorEmail("")
    setDonorPhone("")
    setNotes("")
    setSubmitStatus("idle")
    setErrorMessage(null)
  }

  const handleSubmitOffline = async (e: React.FormEvent) => {
    e.preventDefault()
    const pounds = parseFloat(amountPounds)
    if (Number.isNaN(pounds) || pounds <= 0) {
      setSubmitStatus("error")
      setErrorMessage("Please enter a valid amount")
      return
    }
    if (!fundraiserId) {
      setSubmitStatus("error")
      setErrorMessage("Please select a fundraiser")
      return
    }
    const amountPence = Math.round(pounds * 100)
    setSubmitStatus("submitting")
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
        setSubmitStatus("error")
        setErrorMessage(data.error ?? "Failed to submit")
        return
      }
      setSubmitStatus("success")
      router.refresh()
      setTimeout(() => {
        setOfflineOpen(false)
      }, 1500)
    } catch {
      setSubmitStatus("error")
      setErrorMessage("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
          <div className="px-2 sm:px-4 lg:px-6">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-base sm:text-lg font-semibold">Donations to your fundraisers</h2>
                <Button onClick={handleOpenOffline} disabled={fundraisers.length === 0}>
                  <Banknote className="mr-2 h-4 w-4" />
                  Add offline donation
                </Button>
              </div>
              {fundraisers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a fundraiser first to see and add donations.
                </p>
              ) : (
                <>
                  {validInitialId && (
                    <p className="text-xs text-muted-foreground">
                      Showing donations for:{" "}
                      {fundraisers.find((f) => f.id === validInitialId)?.title ?? "Selected fundraiser"}
                    </p>
                  )}
                <AdminTable<FundraiserDonationRow>
                  data={
                    validInitialId
                      ? donations.filter((d) => d.fundraiserId === validInitialId)
                      : donations
                  }
                  columns={[
                    {
                      id: "donor",
                      header: "Donor / Name",
                      cell: (row) => (
                        <div className="font-medium">{row.donorDisplay}</div>
                      ),
                    },
                    {
                      id: "amount",
                      header: "Amount",
                      cell: (row) => (
                        <div className="font-medium">{formatCurrency(row.amountPence)}</div>
                      ),
                    },
                    {
                      id: "fundraiser",
                      header: "Fundraiser",
                      cell: (row) => (
                        <div className="text-sm">{row.fundraiserTitle}</div>
                      ),
                    },
                    {
                      id: "source",
                      header: "Source",
                      cell: (row) => (
                        <Badge variant={row.source === "online" ? "default" : "secondary"}>
                          {row.source === "online" ? "Online" : "Offline"}
                        </Badge>
                      ),
                    },
                    {
                      id: "status",
                      header: "Status",
                      cell: (row) => (
                        <Badge
                          variant={row.status === "COMPLETED" || row.status === "APPROVED" ? "default" : "outline"}
                          className={
                            row.status === "REFUNDED"
                              ? "px-1.5 bg-orange-500 text-white border-orange-500"
                              : row.status === "FAILED" || row.status === "REJECTED"
                                ? "px-1.5 bg-red-500 text-white border-red-500"
                                : row.status === "PENDING_REVIEW"
                                  ? "px-1.5 bg-amber-500 text-white border-amber-500"
                                  : "px-1.5"
                          }
                        >
                          {row.status === "COMPLETED" || row.status === "APPROVED" ? (
                            <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
                          ) : row.status === "FAILED" || row.status === "REJECTED" ? (
                            <IconX className="mr-1 size-3" />
                          ) : (
                            <IconLoader className="mr-1 size-3" />
                          )}
                          {formatEnum(row.status)}
                        </Badge>
                      ),
                    },
                    {
                      id: "date",
                      header: "Date",
                      cell: (row) => (
                        <div className="text-sm">{formatDate(row.date)}</div>
                      ),
                    },
                  ]}
                  enableSelection={false}
                />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={offlineOpen} onOpenChange={setOfflineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add offline donation</DialogTitle>
            <DialogDescription>
              Record a cash or bank transfer donation for one of your fundraisers. It will be reviewed and added to the total once confirmed.
            </DialogDescription>
          </DialogHeader>
          {submitStatus === "success" ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium py-4">
              Thank you. The offline donation has been recorded and will be reviewed shortly.
            </p>
          ) : (
            <form onSubmit={handleSubmitOffline} className="space-y-4">
              <div className="space-y-2">
                <Label>Fundraiser</Label>
                <Select
                  value={fundraiserId}
                  onValueChange={setFundraiserId}
                  disabled={submitStatus === "submitting"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fundraiser" />
                  </SelectTrigger>
                  <SelectContent>
                    {fundraisers.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offline-amount">Amount (£) *</Label>
                  <Input
                    id="offline-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amountPounds}
                    onChange={(e) => setAmountPounds(e.target.value)}
                    disabled={submitStatus === "submitting"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offline-name">Donor name (optional)</Label>
                  <Input
                    id="offline-name"
                    type="text"
                    placeholder="e.g. John"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    disabled={submitStatus === "submitting"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                    disabled={submitStatus === "submitting"}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    disabled={submitStatus === "submitting"}
                  >
                    <SelectTrigger>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offline-email">Donor email (optional)</Label>
                  <Input
                    id="offline-email"
                    type="email"
                    placeholder="email@example.com"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    disabled={submitStatus === "submitting"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offline-phone">Donor phone (optional)</Label>
                  <Input
                    id="offline-phone"
                    type="text"
                    placeholder="Phone"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    disabled={submitStatus === "submitting"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="offline-notes">Notes (optional)</Label>
                <Textarea
                  id="offline-notes"
                  placeholder="Any notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitStatus === "submitting"}
                  rows={2}
                />
              </div>
              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOfflineOpen(false)}
                  disabled={submitStatus === "submitting"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitStatus === "submitting"}>
                  {submitStatus === "submitting" ? "Submitting…" : "Record offline donation"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
