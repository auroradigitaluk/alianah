"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Gift } from "lucide-react"
import { CHECKOUT_COUNTRIES } from "@/lib/countries"
import { isValidPostcode } from "@/lib/utils"

type AppealOption = { id: string; title: string }
type WaterProjectOption = { id: string; projectType: string; location: string | null }
type WaterProjectCountryOption = {
  id: string
  projectType: string
  country: string
  pricePence: number
}
type SponsorshipProjectOption = { id: string; projectType: string; location: string | null }
type SponsorshipProjectCountryOption = {
  id: string
  projectType: string
  country: string
  pricePence: number
  yearlyPricePence?: number | null
}

type Props = {
  appeals: AppealOption[]
  waterProjects: WaterProjectOption[]
  waterProjectCountries: WaterProjectCountryOption[]
  sponsorshipProjects: SponsorshipProjectOption[]
  sponsorshipProjectCountries: SponsorshipProjectCountryOption[]
}

const DONATION_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
]

const PAYMENT_SOURCES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD_SUMUP", label: "Card (SumUp)" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OFFICE_BUCKETS", label: "Office buckets" },
]

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pump",
  WATER_WELL: "Water Well",
  WATER_TANK: "Water Tank",
  WUDHU_AREA: "Wudhu Area",
}

const SPONSORSHIP_TYPE_LABELS: Record<string, string> = {
  ORPHANS: "Orphans",
  HIFZ: "Hifz",
  FAMILIES: "Families",
}

export function OfflineIncomeModal({
  appeals,
  waterProjects,
  waterProjectCountries,
  sponsorshipProjects,
  sponsorshipProjectCountries,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [entryType, setEntryType] = React.useState<"appeal" | "water" | "sponsorship">("appeal")
  const [appealId, setAppealId] = React.useState("")
  const [projectType, setProjectType] = React.useState("")
  const [countryId, setCountryId] = React.useState("")
  const [sponsorshipType, setSponsorshipType] = React.useState("")
  const [sponsorshipCountryId, setSponsorshipCountryId] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [donationType, setDonationType] = React.useState("GENERAL")
  const [source, setSource] = React.useState("CASH")
  const [receivedAt, setReceivedAt] = React.useState(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })
  const [notes, setNotes] = React.useState("")
  const [plaqueName, setPlaqueName] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [giftAidExpanded, setGiftAidExpanded] = React.useState(false)
  const [giftaidTitle, setGiftaidTitle] = React.useState("")
  const [giftaidPhone, setGiftaidPhone] = React.useState("")
  const [giftaidAddress, setGiftaidAddress] = React.useState("")
  const [giftaidCity, setGiftaidCity] = React.useState("")
  const [giftaidPostcode, setGiftaidPostcode] = React.useState("")
  const [giftaidCountry, setGiftaidCountry] = React.useState("GB")

  const selectedWaterProject = waterProjects.find((p) => p.projectType === projectType) || null
  const filteredCountries = waterProjectCountries
    .filter((c) => c.projectType === projectType)
    .slice()
    .sort((a, b) => a.pricePence - b.pricePence || a.country.localeCompare(b.country))
  const selectedCountry = filteredCountries.find((c) => c.id === countryId) || null

  const selectedSponsorshipProject = sponsorshipProjects.find((p) => p.projectType === sponsorshipType) || null
  const filteredSponsorshipCountries = sponsorshipProjectCountries
    .filter((c) => c.projectType === sponsorshipType)
    .slice()
    .sort((a, b) => a.pricePence - b.pricePence || a.country.localeCompare(b.country))
  const selectedSponsorshipCountry =
    filteredSponsorshipCountries.find((c) => c.id === sponsorshipCountryId) || null

  const countryOptions = React.useMemo(() => {
    const display = new Intl.DisplayNames(["en"], { type: "region" })
    return CHECKOUT_COUNTRIES
      .map((code) => ({ code, label: display.of(code) || code }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  React.useEffect(() => {
    if (!open) return
    if (entryType === "appeal") {
      setProjectType("")
      setCountryId("")
      setSponsorshipType("")
      setSponsorshipCountryId("")
      setPlaqueName("")
      setFirstName("")
      setLastName("")
      setEmail("")
      setAmount("")
      setGiftAidExpanded(false)
      setGiftaidTitle("")
      setGiftaidPhone("")
      setGiftaidAddress("")
      setGiftaidCity("")
      setGiftaidPostcode("")
      setGiftaidCountry("GB")
    }
    if (entryType === "water") {
      setAppealId("")
      setSponsorshipType("")
      setSponsorshipCountryId("")
      setAmount("")
      setGiftAidExpanded(false)
    }
    if (entryType === "sponsorship") {
      setAppealId("")
      setProjectType("")
      setCountryId("")
      setPlaqueName("")
      setAmount("")
      setGiftAidExpanded(false)
    }
  }, [entryType, open])

  React.useEffect(() => {
    if (entryType === "water" && selectedCountry) {
      setAmount((selectedCountry.pricePence / 100).toFixed(2))
    }
    if (entryType === "sponsorship") {
      if (selectedSponsorshipCountry?.yearlyPricePence) {
        setAmount((selectedSponsorshipCountry.yearlyPricePence / 100).toFixed(2))
      } else {
        setAmount("")
      }
    }
  }, [entryType, selectedCountry, selectedSponsorshipCountry])

  const resetForm = () => {
    setEntryType("appeal")
    setAppealId("")
    setProjectType("")
    setCountryId("")
    setSponsorshipType("")
    setSponsorshipCountryId("")
    setAmount("")
    setDonationType("GENERAL")
    setSource("CASH")
    setNotes("")
    setPlaqueName("")
    setFirstName("")
    setLastName("")
    setEmail("")
    setGiftAidExpanded(false)
    setGiftaidTitle("")
    setGiftaidPhone("")
    setGiftaidAddress("")
    setGiftaidCity("")
    setGiftaidPostcode("")
    setGiftaidCountry("GB")
    const today = new Date()
    setReceivedAt(today.toISOString().slice(0, 10))
  }

  const handleSubmit = async () => {
    if (entryType === "appeal") {
      if (!appealId) {
        toast.error("Select an appeal")
        return
      }
      const numericAmount = Number(amount)
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        toast.error("Enter a valid amount")
        return
      }
      if (giftAidExpanded && !email.trim()) {
        toast.error("Email is required for Gift Aid")
        return
      }
      if (giftAidExpanded && giftaidPostcode.trim() && !isValidPostcode(giftaidPostcode, giftaidCountry)) {
        toast.error("Enter a valid postcode")
        return
      }
    }

    if (entryType === "water") {
      if (!projectType || !selectedWaterProject) {
        toast.error("Select a water project type")
        return
      }
      if (!countryId || !selectedCountry) {
        toast.error("Select a country")
        return
      }
      // Donor details are optional for offline entries
    }
    if (entryType === "sponsorship") {
      if (!sponsorshipType || !selectedSponsorshipProject) {
        toast.error("Select a sponsorship type")
        return
      }
      if (!sponsorshipCountryId || !selectedSponsorshipCountry) {
        toast.error("Select a country")
        return
      }
      if (!selectedSponsorshipCountry.yearlyPricePence) {
        toast.error("Yearly price not available for this country")
        return
      }
      // Donor details are optional for offline entries
    }

    setSubmitting(true)
    try {
      const payload =
        entryType === "appeal"
          ? {
              type: "appeal",
              appealId,
              amountPence: Math.round(Number(amount) * 100),
              donationType,
              source,
              collectedVia: "office",
              receivedAt,
              notes: notes || null,
              giftAid: giftAidExpanded,
              ...(giftAidExpanded && email.trim()
                ? {
                    donor: {
                      title: giftaidTitle.trim() || undefined,
                      firstName: firstName.trim() || undefined,
                      lastName: lastName.trim() || undefined,
                      email: email.trim(),
                      phone: giftaidPhone.trim() || undefined,
                      address: giftaidAddress.trim() || undefined,
                      city: giftaidCity.trim() || undefined,
                      postcode: giftaidPostcode.trim() || undefined,
                      country: giftaidCountry.trim() || undefined,
                    },
                  }
                : {}),
            }
          : entryType === "water"
          ? {
              type: "water",
              projectType,
              waterProjectId: selectedWaterProject?.id,
              waterProjectCountryId: selectedCountry?.id,
              donationType,
              source,
              collectedVia: "office",
              receivedAt,
              plaqueName: plaqueName || null,
              notes: notes || null,
              ...(firstName.trim() || lastName.trim() || email.trim()
                ? {
                    donor: {
                      firstName: firstName.trim() || undefined,
                      lastName: lastName.trim() || undefined,
                      email: email.trim() || undefined,
                    },
                  }
                : {}),
            }
          : {
              type: "sponsorship",
              projectType: sponsorshipType,
              sponsorshipProjectId: selectedSponsorshipProject?.id,
              sponsorshipCountryId: selectedSponsorshipCountry?.id,
              donationType,
              source,
              collectedVia: "office",
              receivedAt,
              notes: notes || null,
              ...(firstName.trim() || lastName.trim() || email.trim()
                ? {
                    donor: {
                      firstName: firstName.trim() || undefined,
                      lastName: lastName.trim() || undefined,
                      email: email.trim() || undefined,
                    },
                  }
                : {}),
            }

      const response = await fetch("/api/admin/offline-income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errMsg = typeof data?.error === "string"
          ? data.error
          : Array.isArray(data?.error)
            ? data.error[0]?.message || "Invalid request"
            : "Failed to save entry"
        throw new Error(errMsg)
      }

      toast.success("Entry saved")
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save entry")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Entry
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Offline Entry</DialogTitle>
            <DialogDescription>
              Record an offline donation for appeals, water projects, or sponsorships.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Entry Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={entryType === "appeal" ? "default" : "outline"}
                  onClick={() => setEntryType("appeal")}
                  className="h-11"
                >
                  Appeal
                </Button>
                <Button
                  type="button"
                  variant={entryType === "water" ? "default" : "outline"}
                  onClick={() => setEntryType("water")}
                  className="h-11"
                >
                  Water Project
                </Button>
                <Button
                  type="button"
                  variant={entryType === "sponsorship" ? "default" : "outline"}
                  onClick={() => setEntryType("sponsorship")}
                  className="h-11"
                >
                  Sponsorship
                </Button>
              </div>
            </div>

            {entryType === "appeal" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Appeal</Label>
                  <Select value={appealId} onValueChange={setAppealId}>
                  <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select appeal" />
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appeal-amount">Amount (GBP)</Label>
                    <Input
                      id="appeal-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receivedAt">Received Date</Label>
                    <Input
                      id="receivedAt"
                      type="date"
                      value={receivedAt}
                      onChange={(e) => setReceivedAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant={giftAidExpanded ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setGiftAidExpanded((v) => !v)}
                    className="gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    {giftAidExpanded ? "Gift Aid (details added)" : "Add Gift Aid"}
                  </Button>
                  {giftAidExpanded && (
                    <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Donor details required for Gift Aid (UK taxpayer). Email is required.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="giftaid-title">Title</Label>
                          <Select value={giftaidTitle || "none"} onValueChange={(v) => setGiftaidTitle(v === "none" ? "" : v)}>
                            <SelectTrigger id="giftaid-title">
                              <SelectValue placeholder="Title" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="Mr">Mr</SelectItem>
                              <SelectItem value="Mrs">Mrs</SelectItem>
                              <SelectItem value="Ms">Ms</SelectItem>
                              <SelectItem value="Miss">Miss</SelectItem>
                              <SelectItem value="Dr">Dr</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="giftaid-first">First Name *</Label>
                          <Input
                            id="giftaid-first"
                            transform="titleCase"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="giftaid-last">Last Name *</Label>
                          <Input
                            id="giftaid-last"
                            transform="titleCase"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="giftaid-email">Email *</Label>
                          <Input
                            id="giftaid-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="giftaid-phone">Phone</Label>
                          <Input
                            id="giftaid-phone"
                            value={giftaidPhone}
                            onChange={(e) => setGiftaidPhone(e.target.value)}
                            placeholder="Phone number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="giftaid-country">Country</Label>
                          <Select value={giftaidCountry} onValueChange={setGiftaidCountry}>
                            <SelectTrigger id="giftaid-country">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countryOptions.map(({ code, label }) => (
                                <SelectItem key={code} value={code}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="giftaid-address">Address</Label>
                          <Input
                            id="giftaid-address"
                            transform="titleCase"
                            value={giftaidAddress}
                            onChange={(e) => setGiftaidAddress(e.target.value)}
                            placeholder="Street address"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="giftaid-city">City</Label>
                            <Input
                              id="giftaid-city"
                              transform="titleCase"
                              value={giftaidCity}
                              onChange={(e) => setGiftaidCity(e.target.value)}
                              placeholder="City"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="giftaid-postcode">Postcode</Label>
                            <Input
                              id="giftaid-postcode"
                              transform="uppercase"
                              value={giftaidPostcode}
                              onChange={(e) => setGiftaidPostcode(e.target.value)}
                              placeholder="Postcode"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {entryType === "water" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Water Project Type</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.keys(PROJECT_TYPE_LABELS).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={projectType === type ? "default" : "outline"}
                        onClick={() => {
                          setProjectType(type)
                          setCountryId("")
                        }}
                        className="h-11"
                      >
                        {PROJECT_TYPE_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>

                {projectType && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Country</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredCountries.map((country) => {
                        const isSelected = countryId === country.id
                        return (
                          <Button
                            key={country.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setCountryId(country.id)}
                            className="h-11 justify-center"
                          >
                            {country.country} - £{(country.pricePence / 100).toFixed(2)}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="donor-first">First Name (optional)</Label>
                    <Input
                      id="donor-first"
                      transform="titleCase"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donor-last">Last Name (optional)</Label>
                    <Input
                      id="donor-last"
                      transform="titleCase"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donor-email">Email (optional)</Label>
                    <Input
                      id="donor-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plaqueName">Plaque Name (optional)</Label>
                    <Input
                      id="plaqueName"
                      transform="titleCase"
                      value={plaqueName}
                      onChange={(e) => setPlaqueName(e.target.value)}
                      placeholder="Name for plaque"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receivedAtWater">Received Date</Label>
                    <Input
                      id="receivedAtWater"
                      type="date"
                      value={receivedAt}
                      onChange={(e) => setReceivedAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {entryType === "sponsorship" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Sponsorship Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(SPONSORSHIP_TYPE_LABELS).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={sponsorshipType === type ? "default" : "outline"}
                        onClick={() => {
                          setSponsorshipType(type)
                          setSponsorshipCountryId("")
                        }}
                        className="h-11"
                      >
                        {SPONSORSHIP_TYPE_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>

                {sponsorshipType && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Country</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredSponsorshipCountries.map((country) => {
                        const isSelected = sponsorshipCountryId === country.id
                        const yearlyAvailable = !!country.yearlyPricePence && country.yearlyPricePence > 0
                        return (
                          <Button
                            key={country.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => yearlyAvailable && setSponsorshipCountryId(country.id)}
                            className="h-11 justify-center"
                            disabled={!yearlyAvailable}
                          >
                            {country.country}{" "}
                            {yearlyAvailable
                              ? `- £${(country.yearlyPricePence! / 100).toFixed(2)}`
                              : "- Yearly not set"}
                          </Button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sponsorship entries are recorded as yearly one-off donations.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-first">First Name (optional)</Label>
                    <Input
                      id="sponsor-first"
                      transform="titleCase"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-last">Last Name (optional)</Label>
                    <Input
                      id="sponsor-last"
                      transform="titleCase"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-email">Email (optional)</Label>
                    <Input
                      id="sponsor-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-amount">Yearly Amount (GBP)</Label>
                    <Input id="sponsor-amount" value={amount} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receivedAtSponsor">Received Date</Label>
                    <Input
                      id="receivedAtSponsor"
                      type="date"
                      value={receivedAt}
                      onChange={(e) => setReceivedAt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Donation Type</Label>
                <Select value={donationType} onValueChange={setDonationType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DONATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Payment Method</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                transform="titleCase"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
