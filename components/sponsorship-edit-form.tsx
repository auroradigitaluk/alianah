"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { IconX, IconUpload, IconPlus, IconPencil, IconTrash, IconCheck } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

interface SponsorshipCountry {
  id: string
  projectType: string
  country: string
  pricePence: number
}

interface SponsorshipEditFormProps {
  project: {
    id: string
    projectType: string
    location: string | null
    description: string | null
    isActive: boolean
    status: string | null
    amountPence: number
    completionImages: string
    completionReport: string | null
  }
  countries: SponsorshipCountry[]
}

const PROJECT_TYPES = [
  { value: "ORPHANS", label: "Orphans" },
  { value: "HIFZ", label: "Hifz" },
  { value: "FAMILIES", label: "Families" },
]

const STATUS_OPTIONS = [
  { value: "WAITING_TO_REVIEW", label: "Waiting to Review" },
  { value: "ORDERED", label: "Ordered" },
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETE", label: "Complete" },
]

export function SponsorshipEditForm({ project, countries }: SponsorshipEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [projectType] = useState(project.projectType)
  const [description, setDescription] = useState(project.description || "")
  const [isActive, setIsActive] = useState(project.isActive)
  const [status] = useState(project.status)
  const [completionImages, setCompletionImages] = useState<string[]>(() => {
    try {
      return project.completionImages ? JSON.parse(project.completionImages) : []
    } catch {
      return []
    }
  })
  const [completionReport, setCompletionReport] = useState(project.completionReport || "")
  const [showAddCountry, setShowAddCountry] = useState(false)
  const [newCountryName, setNewCountryName] = useState("")
  const [newCountryPrice, setNewCountryPrice] = useState("")
  const [localCountries, setLocalCountries] = useState(countries)
  const [addingCountry, setAddingCountry] = useState(false)
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null)
  const [editCountryName, setEditCountryName] = useState("")
  const [editCountryPrice, setEditCountryPrice] = useState("")
  const [deletingCountryId, setDeletingCountryId] = useState<string | null>(null)

  const filteredCountries = localCountries.filter((c) => c.projectType === projectType)

  const handleAddCountry = async () => {
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
      const response = await fetch("/api/admin/sponsorships/countries", {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add country")
    } finally {
      setAddingCountry(false)
    }
  }

  const handleEditCountry = (country: SponsorshipCountry) => {
    setEditingCountryId(country.id)
    setEditCountryName(country.country)
    setEditCountryPrice((country.pricePence / 100).toString())
  }

  const handleSaveEdit = async (countryId: string) => {
    if (!editCountryName.trim() || !editCountryPrice) {
      toast.error("Please enter country name and price")
      return
    }

    const pricePence = Math.round(parseFloat(editCountryPrice) * 100)
    if (isNaN(pricePence) || pricePence <= 0) {
      toast.error("Please enter a valid price")
      return
    }

    try {
      const response = await fetch(`/api/admin/sponsorships/countries/${countryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: editCountryName.trim(),
          pricePence,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update country")
      }

      const updatedCountry = await response.json()
      setLocalCountries(localCountries.map(c => c.id === countryId ? updatedCountry : c))
      setEditingCountryId(null)
      setEditCountryName("")
      setEditCountryPrice("")
      toast.success("Country updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update country")
    }
  }

  const handleCancelEdit = () => {
    setEditingCountryId(null)
    setEditCountryName("")
    setEditCountryPrice("")
  }

  const handleDeleteCountry = async (countryId: string) => {
    if (!confirm("Are you sure you want to delete this country? This action cannot be undone.")) {
      return
    }

    setDeletingCountryId(countryId)
    try {
      const response = await fetch(`/api/admin/sponsorships/countries/${countryId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete country")
      }

      setLocalCountries(localCountries.filter(c => c.id !== countryId))
      toast.success("Country deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete country")
    } finally {
      setDeletingCountryId(null)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/admin/sponsorships/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload images")
      }

      const { urls } = await response.json()
      setCompletionImages((prev) => [...prev, ...urls])
      toast.success("Images uploaded successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload images")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setCompletionImages((prev) => prev.filter((_, i) => i !== index))
  }

  const generateReport = async () => {
    if (completionImages.length === 0) {
      toast.error("Please upload at least one image before generating a report")
      return
    }

    setLoading(true)
    try {
      // Generate a simple report based on project details
      const report = `Sponsorship Completion Report

Project Type: ${PROJECT_TYPES.find((t) => t.value === projectType)?.label}
Status: Complete

This project has been successfully completed. The images below show the completed work.

Completion Date: ${new Date().toLocaleDateString()}

Thank you for your support in making this project possible.`

      setCompletionReport(report)
      toast.success("Report generated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate report")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/sponsorships/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description || null,
          isActive,
          completionImages,
          completionReport: completionReport || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update project")
      }

      toast.success("Project updated successfully")
      router.push("/admin/sponsorships")
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
        <Label>Project Type</Label>
        <Input value={PROJECT_TYPES.find((t) => t.value === projectType)?.label || projectType} disabled />
      </div>

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
                onClick={handleAddCountry}
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
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Country</th>
                    <th className="text-left p-3 text-sm font-medium">Price</th>
                    <th className="text-right p-3 text-sm font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCountries.map((country) => (
                    <tr key={country.id} className="border-t">
                      {editingCountryId === country.id ? (
                        <>
                          <td className="p-3">
                            <Input
                              value={editCountryName}
                              onChange={(e) => setEditCountryName(e.target.value)}
                              className="h-8"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editCountryPrice}
                              onChange={(e) => setEditCountryPrice(e.target.value)}
                              className="h-8 w-32"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveEdit(country.id)}
                                className="h-7 w-7 p-0 text-primary hover:text-primary/80"
                              >
                                <IconCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                                className="h-7 w-7 p-0"
                              >
                                <IconX className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-sm font-medium">{country.country}</td>
                          <td className="p-3 text-sm">£{(country.pricePence / 100).toFixed(2)}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditCountry(country)}
                                className="h-7 w-7 p-0"
                              >
                                <IconPencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteCountry(country.id)}
                                disabled={deletingCountryId === country.id}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                {deletingCountryId === country.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <IconTrash className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
      
      {status && (
        <div className="space-y-2">
          <Label>Donation Status</Label>
          <div className="p-2 bg-muted rounded-lg">
            <Badge className={status === "COMPLETE" ? "bg-primary/10 text-primary" : status === "PENDING" ? "bg-orange-500/10 text-orange-700" : status === "ORDERED" ? "bg-blue-500/10 text-blue-700" : "bg-yellow-500/10 text-yellow-700"}>
              {STATUS_OPTIONS.find(opt => opt.value === status)?.label || status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Status is set automatically when donations are made</p>
        </div>
      )}


      {status === "COMPLETE" && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <Label>Completion Images</Label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <Label htmlFor="image-upload">
                <Button type="button" variant="outline" asChild disabled={uploading}>
                  <span>
                    <IconUpload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Images"}
                  </span>
                </Button>
              </Label>
            </div>
            {completionImages.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {completionImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Completion ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                      onClick={() => removeImage(index)}
                    >
                      <IconX className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="completionReport">Completion Report</Label>
              <Button type="button" variant="outline" size="sm" onClick={generateReport}>
                Generate Report
              </Button>
            </div>
            <Textarea
              id="completionReport"
              value={completionReport}
              onChange={(e) => setCompletionReport(e.target.value)}
              placeholder="Completion report will be sent to donors..."
              rows={8}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Update Project"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/sponsorships")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
