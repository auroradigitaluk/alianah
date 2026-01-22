"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { IconPlus, IconX } from "@tabler/icons-react"

interface WaterProjectCountry {
  id: string
  projectType: string
  country: string
  pricePence: number
}

interface WaterProjectFormProps {
  project?: {
    id: string
    projectType: string
    location: string | null
    description: string | null
    isActive: boolean
    status: string | null
    amountPence: number
  }
  countries: WaterProjectCountry[]
}

const PROJECT_TYPES = [
  { value: "WATER_PUMP", label: "Water Pump" },
  { value: "WATER_WELL", label: "Water Well" },
  { value: "WATER_TANK", label: "Water Tank" },
  { value: "WUDHU_AREA", label: "Wudhu Area" },
]


export function WaterProjectForm({ project, countries }: WaterProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [projectType, setProjectType] = useState(project?.projectType || "")
  const [description, setDescription] = useState(project?.description || "")
  const [isActive, setIsActive] = useState(project?.isActive ?? true)
  const [countryRows, setCountryRows] = useState<Array<{ id: string; name: string; price: string }>>([
    { id: `row-${Date.now()}`, name: "", price: "" }
  ])
  const [localCountries, setLocalCountries] = useState(countries)
  const [addingCountries, setAddingCountries] = useState(false)
  const [showAddCountry, setShowAddCountry] = useState(false)
  const [newCountryName, setNewCountryName] = useState("")
  const [newCountryPrice, setNewCountryPrice] = useState("")
  const [addingCountry, setAddingCountry] = useState(false)

  const filteredCountries = localCountries.filter(
    (c) => c.projectType === projectType || (project && c.projectType === project.projectType)
  )

  const addCountryRow = () => {
    setCountryRows([...countryRows, { id: `row-${Date.now()}`, name: "", price: "" }])
  }

  const removeCountryRow = (id: string) => {
    if (countryRows.length > 1) {
      setCountryRows(countryRows.filter(row => row.id !== id))
    }
  }

  const updateCountryRow = (id: string, field: "name" | "price", value: string) => {
    setCountryRows(countryRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ))
  }

  const handleAddCountries = async () => {
    if (!projectType) {
      toast.error("Please select a project type first")
      return
    }

    const validRows = countryRows.filter(row => row.name.trim() && row.price)
    if (validRows.length === 0) {
      toast.error("Please add at least one country with name and price")
      return
    }

    setAddingCountries(true)
    try {
      const countriesToAdd = validRows.map(row => ({
        projectType,
        country: row.name.trim(),
        pricePence: Math.round(parseFloat(row.price) * 100),
        isActive: true,
        sortOrder: 0,
      }))

      // Create all countries
      const promises = countriesToAdd.map(countryData =>
        fetch("/api/admin/water-projects/countries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(countryData),
        }).then(res => res.json())
      )

      const newCountries = await Promise.all(promises)
      setLocalCountries([...localCountries, ...newCountries])
      
      // Reset rows to one empty row
      setCountryRows([{ id: `row-${Date.now()}`, name: "", price: "" }])
      toast.success(`${newCountries.length} countr${newCountries.length > 1 ? 'ies' : 'y'} added successfully`)
    } catch (error: any) {
      toast.error(error.message || "Failed to add countries")
    } finally {
      setAddingCountries(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const amountPence = Math.round(parseFloat(amount) * 100)
      if (isNaN(amountPence) || amountPence <= 0) {
        toast.error("Please enter a valid amount")
        setLoading(false)
        return
      }

      // Check if project type already exists
      if (!project) {
        const existing = await fetch(`/api/admin/water-projects?projectType=${projectType}`)
          .then(res => res.json())
          .then(projects => projects.find((p: any) => p.projectType === projectType))
          .catch(() => null)

        if (existing) {
          toast.error("A project of this type already exists. Each project type can only have one project.")
          setLoading(false)
          return
        }
      }

      const url = project ? `/api/admin/water-projects/${project.id}` : "/api/admin/water-projects"
      const method = project ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType,
          description: description || null,
          isActive,
          amountPence: 0,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save project")
      }

      toast.success(project ? "Project updated successfully" : "Project created successfully")
      router.push("/admin/water-projects")
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
        <Select value={projectType} onValueChange={setProjectType} disabled={!!project}>
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

      {!project ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add Countries *</Label>
            <p className="text-sm text-muted-foreground">
              Add countries for this project type. Each country will have its own price.
            </p>
          </div>
          
          <div className="space-y-3">
            {countryRows.map((row, index) => (
              <div key={row.id} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Country name"
                    value={row.name}
                    onChange={(e) => updateCountryRow(row.id, "name", e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price (GBP)"
                    value={row.price}
                    onChange={(e) => updateCountryRow(row.id, "price", e.target.value)}
                  />
                </div>
                {countryRows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCountryRow(row.id)}
                    className="h-10 w-10"
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addCountryRow}
            className="w-full"
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Add Another
          </Button>

          {countryRows.some(row => row.name.trim() && row.price) && (
            <Button
              type="button"
              onClick={handleAddCountries}
              disabled={addingCountries || !projectType}
              className="w-full"
            >
              {addingCountries ? "Adding Countries..." : "Add Countries"}
            </Button>
          )}

          {localCountries.filter(c => c.projectType === projectType).length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Available Countries for {PROJECT_TYPES.find(t => t.value === projectType)?.label}</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Country</th>
                      <th className="text-left p-3 text-sm font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localCountries.filter(c => c.projectType === projectType).map((country) => (
                      <tr key={country.id} className="border-t">
                        <td className="p-3 text-sm font-medium">{country.country}</td>
                        <td className="p-3 text-sm">£{(country.pricePence / 100).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label>Manage Countries</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddCountry(!showAddCountry)}
              className="h-7"
            >
              <IconPlus className="h-3 w-3 mr-1" />
              Add Country
            </Button>
          </div>
          {showAddCountry && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter country name"
                  value={newCountryName}
                  onChange={(e) => setNewCountryName(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price (GBP)"
                  value={newCountryPrice}
                  onChange={(e) => setNewCountryPrice(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    if (!newCountryName.trim() || !projectType || !newCountryPrice) {
                      toast.error("Please enter country name and price")
                      return
                    }

                    const pricePence = Math.round(parseFloat(newCountryPrice) * 100)
                    if (isNaN(pricePence) || pricePence <= 0) {
                      toast.error("Please enter a valid price")
                      return
                    }

                    setAddingCountry(true)
                    try {
                      const response = await fetch("/api/admin/water-projects/countries", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          projectType,
                          country: newCountryName.trim(),
                          pricePence,
                          isActive: true,
                          sortOrder: 0,
                        }),
                      })

                      if (!response.ok) {
                        const error = await response.json()
                        throw new Error(error.error || "Failed to add country")
                      }

                      const newCountry = await response.json()
                      setLocalCountries([...localCountries, newCountry])
                      setNewCountryName("")
                      setNewCountryPrice("")
                      setShowAddCountry(false)
                      toast.success("Country added successfully")
                    } catch (error: any) {
                      toast.error(error.message || "Failed to add country")
                    } finally {
                      setAddingCountry(false)
                    }
                  }}
                  disabled={addingCountry || !newCountryName.trim() || !newCountryPrice}
                >
                  {addingCountry ? "Adding..." : "Add"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddCountry(false)
                    setNewCountryName("")
                    setNewCountryPrice("")
                  }}
                >
                  <IconX className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {filteredCountries.length > 0 && (
            <div className="space-y-2">
              <Label>Available Countries</Label>
              <div className="grid grid-cols-2 gap-2">
                {filteredCountries.map((country) => (
                  <div key={country.id} className="p-2 border rounded text-sm">
                    <div className="font-medium">{country.country}</div>
                    <div className="text-muted-foreground">£{(country.pricePence / 100).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details about this project"
          rows={4}
        />
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
          {loading ? "Saving..." : project ? "Update Project" : "Create Project"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/water-projects")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
