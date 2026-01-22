"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface WaterProjectDonationFormProps {
  projectId: string
  projectType: string
}

const DONATION_TYPES = [
  { value: "GENERAL", label: "General Donation" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
]

const PRESET_AMOUNTS = [25, 50, 100, 250, 500, 1000]

export function WaterProjectDonationForm({ projectId, projectType }: WaterProjectDonationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [countryId, setCountryId] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [donationType, setDonationType] = useState("GENERAL")
  const [giftAid, setGiftAid] = useState(false)
  const [countries, setCountries] = useState<Array<{ id: string; country: string; pricePence: number }>>([])
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    country: "",
  })

  // Fetch countries for this project type
  React.useEffect(() => {
    fetch(`/api/admin/water-projects/countries?projectType=${projectType}`)
      .then(res => res.json())
      .then(data => {
        const filtered = data.filter((c: any) => c.projectType === projectType && c.isActive)
        setCountries(filtered)
      })
      .catch(err => console.error("Error fetching countries:", err))
  }, [projectType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!countryId) {
        toast.error("Please select a country")
        setLoading(false)
        return
      }

      const selectedCountry = countries.find(c => c.id === countryId)
      if (!selectedCountry) {
        toast.error("Selected country not found")
        setLoading(false)
        return
      }

      // Use the country's price
      const amountPence = selectedCountry.pricePence

      const response = await fetch("/api/water-projects/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waterProjectId: projectId,
          countryId: countryId,
          ...formData,
          amountPence,
          donationType,
          paymentMethod: "STRIPE", // TODO: Integrate actual payment
          giftAid,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to process donation")
      }

      const result = await response.json()
      toast.success("Donation submitted successfully! You will receive a confirmation email shortly.")
      
      // Reset form
      setAmount("")
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        postcode: "",
        country: "",
      })
      setGiftAid(false)
      
      // TODO: Redirect to payment page or success page
      // router.push(`/water-for-life/success/${result.donationId}`)
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Select Country *</Label>
        <Select value={countryId} onValueChange={(value) => {
          setCountryId(value)
          const selected = countries.find(c => c.id === value)
          if (selected) {
            setAmount((selected.pricePence / 100).toString())
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.id} value={country.id}>
                {country.country} - £{(country.pricePence / 100).toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {countryId && (
          <p className="text-sm text-muted-foreground">
            Amount: £{(countries.find(c => c.id === countryId)?.pricePence || 0) / 100}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Donation Type</Label>
        <Select value={donationType} onValueChange={setDonationType}>
          <SelectTrigger>
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

      <div className="space-y-4">
        <h3 className="font-semibold">Your Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="giftAid"
          checked={giftAid}
          onCheckedChange={(checked) => setGiftAid(checked === true)}
        />
        <Label htmlFor="giftAid" className="font-normal cursor-pointer text-sm">
          I am a UK taxpayer and would like Alianah to reclaim Gift Aid on my donation
        </Label>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Processing..." : "Donate Now"}
      </Button>
    </form>
  )
}
