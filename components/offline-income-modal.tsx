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
import { Plus } from "lucide-react"

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
    }
    if (entryType === "water") {
      setAppealId("")
      setSponsorshipType("")
      setSponsorshipCountryId("")
      setAmount("")
    }
    if (entryType === "sponsorship") {
      setAppealId("")
      setProjectType("")
      setCountryId("")
      setPlaqueName("")
      setAmount("")
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
              donor: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
              },
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
              donor: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
              },
            }

      const response = await fetch("/api/admin/offline-income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Failed to save entry")
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
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donor-last">Last Name (optional)</Label>
                    <Input
                      id="donor-last"
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
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sponsor-last">Last Name (optional)</Label>
                    <Input
                      id="sponsor-last"
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
