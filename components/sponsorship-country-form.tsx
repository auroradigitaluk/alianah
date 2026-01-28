"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface SponsorshipCountryFormProps {
  country?: {
    id: string
    projectType: string
    country: string
    pricePence: number
    yearlyPricePence?: number | null
    isActive: boolean
    sortOrder: number
  }
}

const PROJECT_TYPES = [
  { value: "ORPHANS", label: "Orphans" },
  { value: "HIFZ", label: "Hifz" },
  { value: "FAMILIES", label: "Families" },
]

export function SponsorshipCountryForm({ country }: SponsorshipCountryFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [projectType, setProjectType] = useState(country?.projectType || "")
  const [countryName, setCountryName] = useState(country?.country || "")
  const [pricePence, setPricePence] = useState<string>(country ? (country.pricePence / 100).toFixed(2) : "")
  const [yearlyPricePence, setYearlyPricePence] = useState<string>(
    country?.yearlyPricePence ? (country.yearlyPricePence / 100).toFixed(2) : ""
  )
  const [isActive, setIsActive] = useState(country?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState<string>(country?.sortOrder.toString() || "0")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = country ? `/api/admin/sponsorships/countries/${country.id}` : "/api/admin/sponsorships/countries"
      const method = country ? "PUT" : "POST"
      const payload: Record<string, unknown> = {
        projectType,
        country: countryName,
        isActive,
        sortOrder: parseInt(sortOrder) || 0,
      }
      if (!country) {
        const p = Math.round(parseFloat(pricePence || "0") * 100)
        if (!p || p <= 0) {
          toast.error("Please enter a valid price")
          setLoading(false)
          return
        }
        payload.pricePence = p
        if (yearlyPricePence) {
          payload.yearlyPricePence = Math.round(parseFloat(yearlyPricePence) * 100)
        }
      } else if (pricePence) {
        payload.pricePence = Math.round(parseFloat(pricePence) * 100)
      }
      if (country) {
        payload.yearlyPricePence = yearlyPricePence
          ? Math.round(parseFloat(yearlyPricePence) * 100)
          : null
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        const message = Array.isArray(error?.error)
          ? error.error.map((issue: { message?: string }) => issue.message).filter(Boolean).join(", ")
          : error?.error
        throw new Error(message || "Failed to save country")
      }

      toast.success(country ? "Country updated successfully" : "Country created successfully")
      router.push("/admin/sponsorships/countries")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="projectType">Project Type *</Label>
        <Select value={projectType} onValueChange={setProjectType} disabled={!!country}>
          <SelectTrigger id="projectType">
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country *</Label>
        <Input
          id="country"
          value={countryName}
          onChange={(e) => setCountryName(e.target.value)}
          placeholder="e.g., Pakistan, Bangladesh"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price (GBP) *</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={pricePence}
          onChange={(e) => setPricePence(e.target.value)}
          placeholder="e.g., 25.00"
          required={!country}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="yearly-price">Yearly Price (GBP)</Label>
        <Input
          id="yearly-price"
          type="number"
          step="0.01"
          min="0"
          value={yearlyPricePence}
          onChange={(e) => setYearlyPricePence(e.target.value)}
          placeholder="e.g., 300.00"
        />
        <p className="text-sm text-muted-foreground">Optional one-off yearly price</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sort Order</Label>
        <Input
          id="sortOrder"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="0"
        />
        <p className="text-sm text-muted-foreground">Lower numbers appear first</p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <Label htmlFor="isActive" className="font-normal cursor-pointer">
          Active
        </Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : country ? "Update Country" : "Create Country"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/sponsorships/countries")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
