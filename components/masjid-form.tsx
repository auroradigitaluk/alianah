"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "ON_HOLD", label: "On hold" },
]

const CONTACT_METHODS = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "ANY", label: "Any" },
]

interface MasjidFormProps {
  masjid?: {
    id: string
    name: string
    status: string
    address: string
    city: string
    postcode?: string | null
    country?: string | null
    region?: string | null
    contactName?: string | null
    contactRole?: string | null
    phone?: string | null
    email?: string | null
    phoneAlt?: string | null
    emailAlt?: string | null
    secondaryContactName?: string | null
    secondaryContactRole?: string | null
    website?: string | null
    preferredContactMethod?: string | null
    lastContactedAt?: string | Date | null
    nextFollowUpAt?: string | Date | null
    notes?: string | null
  }
  onSuccess?: () => void
  redirectTo?: string | null
}

const formatDateInput = (value?: string | Date | null) => {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const isValidPhone = (value: string) =>
  /^[+()0-9\s-]{7,}$/.test(value.trim())

const isValidMasjidPostcode = (value: string) =>
  value.trim() === "" || /^[A-Za-z0-9\s-]{3,10}$/.test(value.trim())

export function MasjidForm({ masjid, onSuccess, redirectTo = "/admin/masjids" }: MasjidFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [name, setName] = useState(masjid?.name || "")
  const [status, setStatus] = useState(masjid?.status || "ACTIVE")
  const [address, setAddress] = useState(masjid?.address || "")
  const [city, setCity] = useState(masjid?.city || "")
  const [postcode, setPostcode] = useState(masjid?.postcode || "")
  const [country, setCountry] = useState(masjid?.country || "")
  const [region, setRegion] = useState(masjid?.region || "")
  const [website, setWebsite] = useState(masjid?.website || "")
  const [contactName, setContactName] = useState(masjid?.contactName || "")
  const [contactRole, setContactRole] = useState(masjid?.contactRole || "")
  const [phone, setPhone] = useState(masjid?.phone || "")
  const [email, setEmail] = useState(masjid?.email || "")
  const [secondaryContactName, setSecondaryContactName] = useState(
    masjid?.secondaryContactName || ""
  )
  const [secondaryContactRole, setSecondaryContactRole] = useState(
    masjid?.secondaryContactRole || ""
  )
  const [phoneAlt, setPhoneAlt] = useState(masjid?.phoneAlt || "")
  const [emailAlt, setEmailAlt] = useState(masjid?.emailAlt || "")
  const [preferredContactMethod, setPreferredContactMethod] = useState(
    masjid?.preferredContactMethod || "ANY"
  )
  const [lastContactedAt, setLastContactedAt] = useState(formatDateInput(masjid?.lastContactedAt))
  const [nextFollowUpAt, setNextFollowUpAt] = useState(formatDateInput(masjid?.nextFollowUpAt))
  const [notes, setNotes] = useState(masjid?.notes || "")

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!name.trim()) nextErrors.name = "Masjid name is required"
    if (!address.trim()) nextErrors.address = "Address is required"
    if (!city.trim()) nextErrors.city = "City is required"
    if (!postcode.trim()) nextErrors.postcode = "Postcode is required"
    else if (!isValidMasjidPostcode(postcode)) nextErrors.postcode = "Enter a valid postcode"
    if (!country.trim()) nextErrors.country = "Country is required"
    if (!contactName.trim()) nextErrors.contactName = "Contact name is required"
    if (!contactRole.trim()) nextErrors.contactRole = "Contact role is required"
    if (!phone.trim()) nextErrors.phone = "Phone is required"
    else if (!isValidPhone(phone)) nextErrors.phone = "Enter a valid phone number"

    if (email && !isValidEmail(email)) nextErrors.email = "Enter a valid email address"
    if (emailAlt && !isValidEmail(emailAlt)) nextErrors.emailAlt = "Enter a valid email address"
    if (phoneAlt && !isValidPhone(phoneAlt)) nextErrors.phoneAlt = "Enter a valid phone number"

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateForm()) {
      toast.error("Please fix the highlighted fields")
      return
    }
    setLoading(true)

    try {
      const url = masjid ? `/api/admin/masjids/${masjid.id}` : "/api/admin/masjids"
      const method = masjid ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status,
          address,
          city,
          postcode,
          country,
          region,
          website,
          contactName,
          contactRole,
          phone,
          email,
          secondaryContactName,
          secondaryContactRole,
          phoneAlt,
          emailAlt,
          preferredContactMethod,
          lastContactedAt: lastContactedAt || null,
          nextFollowUpAt: nextFollowUpAt || null,
          notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save masjid")
      }

      toast.success(masjid ? "Masjid updated successfully" : "Masjid created successfully")
      if (redirectTo) {
        router.push(redirectTo)
      }
      router.refresh()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Masjid Details
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Masjid Name *</Label>
            <Input
              id="name"
              transform="titleCase"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: "" }))
              }}
              placeholder="Masjid name"
              required
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              transform="titleCase"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value)
                setErrors((prev) => ({ ...prev, address: "" }))
              }}
              placeholder="Street address"
              required
            />
            {errors.address ? <p className="text-xs text-destructive">{errors.address}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              transform="titleCase"
              value={city}
              onChange={(e) => {
                setCity(e.target.value)
                setErrors((prev) => ({ ...prev, city: "" }))
              }}
              placeholder="City"
              required
            />
            {errors.city ? <p className="text-xs text-destructive">{errors.city}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode *</Label>
            <Input
              id="postcode"
              transform="uppercase"
              value={postcode}
              required
              onChange={(e) => {
                setPostcode(e.target.value)
                setErrors((prev) => ({ ...prev, postcode: "" }))
              }}
              placeholder="Postcode"
            />
            {errors.postcode ? <p className="text-xs text-destructive">{errors.postcode}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              transform="titleCase"
              value={country}
              required
              onChange={(e) => {
                setCountry(e.target.value)
                setErrors((prev) => ({ ...prev, country: "" }))
              }}
              placeholder="Country"
            />
            {errors.country ? <p className="text-xs text-destructive">{errors.country}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              transform="titleCase"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Region / Area"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Primary Contact
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name *</Label>
            <Input
              id="contactName"
              transform="titleCase"
              value={contactName}
              required
              onChange={(e) => {
                setContactName(e.target.value)
                setErrors((prev) => ({ ...prev, contactName: "" }))
              }}
              placeholder="Primary contact name"
            />
            {errors.contactName ? <p className="text-xs text-destructive">{errors.contactName}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactRole">Contact Role *</Label>
            <Input
              id="contactRole"
              transform="titleCase"
              value={contactRole}
              required
              onChange={(e) => {
                setContactRole(e.target.value)
                setErrors((prev) => ({ ...prev, contactRole: "" }))
              }}
              placeholder="Imam, Trustee, Secretary"
            />
            {errors.contactRole ? <p className="text-xs text-destructive">{errors.contactRole}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={phone}
              required
              onChange={(e) => {
                setPhone(e.target.value)
                setErrors((prev) => ({ ...prev, phone: "" }))
              }}
              placeholder="Phone number"
            />
            {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((prev) => ({ ...prev, email: "" }))
              }}
              placeholder="Email address"
            />
            {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredContactMethod">Preferred Contact</Label>
            <Select
              value={preferredContactMethod}
              onValueChange={setPreferredContactMethod}
            >
              <SelectTrigger id="preferredContactMethod">
                <SelectValue placeholder="Preferred contact method" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_METHODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Secondary Contact
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="secondaryContactName">Contact Name</Label>
            <Input
              id="secondaryContactName"
              transform="titleCase"
              value={secondaryContactName}
              onChange={(e) => setSecondaryContactName(e.target.value)}
              placeholder="Secondary contact name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryContactRole">Contact Role</Label>
            <Input
              id="secondaryContactRole"
              transform="titleCase"
              value={secondaryContactRole}
              onChange={(e) => setSecondaryContactRole(e.target.value)}
              placeholder="Treasurer, Volunteer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneAlt">Secondary Phone</Label>
            <Input
              id="phoneAlt"
              value={phoneAlt}
              onChange={(e) => {
                setPhoneAlt(e.target.value)
                setErrors((prev) => ({ ...prev, phoneAlt: "" }))
              }}
              placeholder="Secondary phone number"
            />
            {errors.phoneAlt ? <p className="text-xs text-destructive">{errors.phoneAlt}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailAlt">Secondary Email</Label>
            <Input
              id="emailAlt"
              type="email"
              value={emailAlt}
              onChange={(e) => {
                setEmailAlt(e.target.value)
                setErrors((prev) => ({ ...prev, emailAlt: "" }))
              }}
              placeholder="Secondary email"
            />
            {errors.emailAlt ? <p className="text-xs text-destructive">{errors.emailAlt}</p> : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Relationship Tracking
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lastContactedAt">Last Contacted</Label>
            <Input
              id="lastContactedAt"
              type="date"
              value={lastContactedAt}
              onChange={(e) => setLastContactedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextFollowUpAt">Next Follow-up</Label>
            <Input
              id="nextFollowUpAt"
              type="date"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              transform="titleCase"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any relationship notes or details"
              rows={4}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : masjid ? "Update Masjid" : "Create Masjid"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/masjids")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
