"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface WaterProjectCountryFormProps {
  country?: {
    id: string
    projectType: string
    country: string
    isActive: boolean
    sortOrder: number
  }
}

const PROJECT_TYPES = [
  { value: "WATER_PUMP", label: "Water Pump" },
  { value: "WATER_WELL", label: "Water Well" },
  { value: "WATER_TANK", label: "Water Tank" },
  { value: "WUDHU_AREA", label: "Wudhu Area" },
]

export function WaterProjectCountryForm({ country }: WaterProjectCountryFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [projectType, setProjectType] = useState(country?.projectType || "")
  const [countryName, setCountryName] = useState(country?.country || "")
  const [isActive, setIsActive] = useState(country?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState<string>(country?.sortOrder.toString() || "0")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = country ? `/api/admin/water-projects/countries/${country.id}` : "/api/admin/water-projects/countries"
      const method = country ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType,
          country: countryName,
          isActive,
          sortOrder: parseInt(sortOrder) || 0,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save country")
      }

      toast.success(country ? "Country updated successfully" : "Country created successfully")
      router.push("/admin/water-projects/countries")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
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
          onClick={() => router.push("/admin/water-projects/countries")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
