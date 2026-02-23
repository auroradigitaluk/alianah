"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import type { EligibleCampaign } from "@/app/admin/fundraisers/page"

const PRESET_AMOUNTS_PENCE = [100000, 250000, 500000, 1000000] // £1000, £2500, £5000, £10000

interface CountryOption {
  id: string
  country: string
  pricePence: number
}

interface CreateFundraiserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eligibleCampaigns: EligibleCampaign[]
}

function getDefaultMessage(fundraiserName: string, campaignTitle: string): string {
  if (fundraiserName) {
    return `${fundraiserName} is fundraising for ${campaignTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
  }
  return `I am fundraising for ${campaignTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
}

export function CreateFundraiserDialog({
  open,
  onOpenChange,
  eligibleCampaigns,
}: CreateFundraiserDialogProps) {
  const router = useRouter()
  const [fundraiserName, setFundraiserName] = useState("")
  const [email, setEmail] = useState("")
  const [campaignId, setCampaignId] = useState<string>("")
  const [campaignType, setCampaignType] = useState<"APPEAL" | "WATER" | null>(null)
  const [campaignTitle, setCampaignTitle] = useState("")
  const [targetPounds, setTargetPounds] = useState("")
  const [message, setMessage] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [waterCountries, setWaterCountries] = useState<CountryOption[]>([])
  const [selectedCountryId, setSelectedCountryId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    fundraiserUrl: string
    email: string
    emailFailed?: boolean
  } | null>(null)

  const selectedCampaign = eligibleCampaigns.find((c) => c.id === campaignId)

  const handleCampaignSelect = (value: string) => {
    const campaign = eligibleCampaigns.find((c) => c.id === value)
    if (campaign) {
      setCampaignId(campaign.id)
      setCampaignType(campaign.type)
      setCampaignTitle(campaign.title)
      setSelectedCountryId("")
      setWaterCountries([])
      setTargetPounds("")
      if (campaign.type === "WATER") {
        setQuantity(1)
      }
    }
  }

  // Fetch water countries when a water campaign is selected
  useEffect(() => {
    if (campaignType !== "WATER" || !selectedCampaign?.projectType) {
      setWaterCountries([])
      return
    }
    fetch(`/api/admin/water-projects/countries?projectType=${selectedCampaign.projectType}`)
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          setWaterCountries([])
          return
        }
        const list = data
          .filter((c): c is { id: string; country: string; pricePence: number } => {
            return (
              typeof c === "object" &&
              c !== null &&
              "id" in c &&
              "country" in c &&
              "pricePence" in c &&
              typeof (c as { id: unknown }).id === "string" &&
              typeof (c as { country: unknown }).country === "string" &&
              typeof (c as { pricePence: unknown }).pricePence === "number"
            )
          })
          .map((c) => ({ id: c.id, country: c.country, pricePence: c.pricePence }))
        setWaterCountries(list)
      })
      .catch(() => setWaterCountries([]))
  }, [campaignType, selectedCampaign?.projectType])

  // Compute target from country × quantity for water
  useEffect(() => {
    if (campaignType !== "WATER") return
    const selected = waterCountries.find((c) => c.id === selectedCountryId)
    if (selected) {
      const totalPence = selected.pricePence * Math.max(1, quantity)
      setTargetPounds((totalPence / 100).toFixed(2))
    } else {
      setTargetPounds("")
    }
  }, [campaignType, waterCountries, selectedCountryId, quantity])

  const resetForm = () => {
    setFundraiserName("")
    setEmail("")
    setCampaignId("")
    setCampaignType(null)
    setCampaignTitle("")
    setTargetPounds("")
    setMessage("")
    setQuantity(1)
    setSelectedCountryId("")
    setWaterCountries([])
    setError(null)
    setSuccess(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm()
    onOpenChange(next)
  }

  const handlePresetClick = (amountPence: number) => {
    setTargetPounds((amountPence / 100).toString())
  }

  const isPresetSelected = (amountPence: number) => {
    const amountInPounds = amountPence / 100
    const current = parseFloat(targetPounds)
    return !isNaN(current) && Math.abs(current - amountInPounds) < 0.01
  }

  const computedFundraiserTitle =
    fundraiserName.trim() && campaignTitle
      ? `${fundraiserName.trim()} is fundraising for ${campaignTitle}`
      : campaignTitle
        ? `Fundraising for ${campaignTitle}`
        : ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const name = fundraiserName.trim()
    const emailVal = email.trim()
    if (!name || !emailVal) {
      setError("Your name and email address are required.")
      return
    }
    if (!campaignId || !campaignType) {
      setError("Please select a campaign.")
      return
    }

    let targetPence: number | null = null
    if (campaignType === "WATER") {
      if (!selectedCountryId) {
        setError("Please choose a country.")
        return
      }
      const selected = waterCountries.find((c) => c.id === selectedCountryId)
      if (!selected) {
        setError("Please choose a country.")
        return
      }
      targetPence = selected.pricePence * Math.max(1, quantity)
    } else {
      const parsed = parseFloat(targetPounds)
      if (isNaN(parsed) || parsed < 0.01) {
        setError("Target amount is required and must be greater than 0.")
        return
      }
      targetPence = Math.round(parsed * 100)
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        fundraiserName: name,
        email: emailVal,
        title: computedFundraiserTitle || undefined,
        message: message.trim() || undefined,
        targetAmountPence: targetPence,
      }
      if (campaignType === "APPEAL") body.appealId = campaignId
      else body.waterProjectId = campaignId

      const response = await fetch("/api/admin/fundraisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error ?? "Failed to create fundraiser")
        setSaving(false)
        return
      }

      const base =
        process.env.NEXT_PUBLIC_FUNDRAISER_BASE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "")
      const baseTrimmed = (base || "").replace(/\/$/, "")
      setSuccess({
        fundraiserUrl:
          data.fundraiserUrl ??
          (baseTrimmed ? `${baseTrimmed}/fundraise/${data.slug}` : ""),
        email: emailVal,
        emailFailed: Boolean(data.emailError),
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const hasCampaigns = eligibleCampaigns.length > 0
  const sortedWaterCountries = [...waterCountries].sort(
    (a, b) => a.pricePence - b.pricePence || a.country.localeCompare(b.country)
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-y-auto max-h-[90vh]">
        <VisuallyHidden.Root>
          <DialogTitle>Start a Fundraiser</DialogTitle>
        </VisuallyHidden.Root>
        {success ? (
          <div className="p-6 space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">Fundraiser created</p>
              <p className="mt-1 text-muted-foreground">
                {success.emailFailed ? (
                  <>
                    The welcome email could not be sent. Please share the link below with{" "}
                    <strong>{success.email}</strong> manually.
                  </>
                ) : (
                  <>
                    A link has been sent to <strong>{success.email}</strong>. They can share it to
                    collect donations.
                  </>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Fundraiser page</Label>
              <p className="break-all font-mono text-sm">{success.fundraiserUrl}</p>
            </div>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Start a Fundraiser</CardTitle>
              <CardDescription>
                {selectedCampaign
                  ? `Create a fundraising page for ${campaignTitle}`
                  : "Select a campaign to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!hasCampaigns && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    No campaigns have fundraising enabled. Enable fundraising on an appeal or water
                    project first.
                  </p>
                )}

                <div className="space-y-2">
                  <Label>Campaign *</Label>
                  <Select
                    value={campaignId}
                    onValueChange={handleCampaignSelect}
                    disabled={!hasCampaigns}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select appeal or water project" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleCampaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title} ({c.type === "APPEAL" ? "Appeal" : "Water"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {computedFundraiserTitle && (
                  <div className="space-y-2">
                    <Label htmlFor="fundraiser-title">Fundraiser Name *</Label>
                    <Input
                      id="fundraiser-title"
                      value={computedFundraiserTitle}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="create-fundraiser-name">Full Name *</Label>
                  <Input
                    id="create-fundraiser-name"
                    transform="titleCase"
                    value={fundraiserName}
                    onChange={(e) => setFundraiserName(e.target.value)}
                    placeholder="Their full name"
                    disabled={!hasCampaigns}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-fundraiser-email">Email Address *</Label>
                  <Input
                    id="create-fundraiser-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="their@email.com"
                    disabled={!hasCampaigns}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="create-fundraiser-message">Why are you fundraising? (Optional)</Label>
                  <Textarea
                    id="create-fundraiser-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      campaignTitle
                        ? getDefaultMessage(fundraiserName.trim(), campaignTitle)
                        : "Optional message shown on the fundraiser page"
                    }
                    rows={4}
                    className="resize-y"
                    disabled={!hasCampaigns}
                  />
                </div>

                {campaignType === "WATER" && (
                  <>
                    <div className="space-y-2">
                      <Label>Choose Country *</Label>
                      <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
                        {sortedWaterCountries.map((country) => {
                          const isSelected = selectedCountryId === country.id
                          return (
                            <Button
                              key={country.id}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => setSelectedCountryId(country.id)}
                              className="group w-full h-16 flex-col items-center justify-center px-3 py-2.5 text-center hover:!bg-primary hover:!text-primary-foreground hover:!border-primary"
                            >
                              <span className="text-sm font-medium leading-tight">
                                {country.country}
                              </span>
                              <span
                                className={
                                  isSelected
                                    ? "text-base font-semibold mt-0.5 leading-tight text-center text-primary-foreground/90"
                                    : "text-base font-semibold mt-0.5 leading-tight text-center text-foreground/80 group-hover:text-white"
                                }
                              >
                                {formatCurrency(country.pricePence)}
                              </span>
                            </Button>
                          )
                        })}
                      </div>
                      {!selectedCountryId && waterCountries.length > 0 && (
                        <p className="text-xs text-muted-foreground">Choose a country to set your target.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-fundraiser-quantity">How many projects? *</Label>
                      <Input
                        id="create-fundraiser-quantity"
                        type="number"
                        min={1}
                        step={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                        disabled={!hasCampaigns}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your target is calculated using the selected country price × quantity.
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="create-fundraiser-target">Target Amount *</Label>
                  {campaignType === "APPEAL" && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {PRESET_AMOUNTS_PENCE.map((amountPence) => (
                        <Button
                          key={amountPence}
                          type="button"
                          variant={isPresetSelected(amountPence) ? "default" : "outline"}
                          onClick={() => handlePresetClick(amountPence)}
                          className="h-11 text-base"
                        >
                          {formatCurrency(amountPence)}
                        </Button>
                      ))}
                    </div>
                  )}
                  <Input
                    id="create-fundraiser-target"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={targetPounds}
                    onChange={(e) => setTargetPounds(e.target.value)}
                    placeholder="0.00"
                    disabled={campaignType === "WATER"}
                    className={campaignType === "WATER" ? "bg-muted cursor-not-allowed" : undefined}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !hasCampaigns} className="flex-1 w-full">
                    {saving ? "Creating..." : "Create Fundraiser"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  )
}
