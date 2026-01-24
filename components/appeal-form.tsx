"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AppealFormProps {
  appeal?: {
    id: string
    title: string
    slug: string
    summary: string
    framerUrl: string | null
    isActive: boolean
    donationTypesEnabled: string[]
    defaultDonationType: string
    allowMonthly: boolean
    allowYearly: boolean
    allowFundraising?: boolean
    appealImageUrls?: string
    fundraisingImageUrls?: string
    monthlyPricePence?: number | null
    yearlyPricePence?: number | null
    oneOffPresetAmountsPence?: string
    monthlyPresetAmountsPence?: string
    yearlyPresetAmountsPence?: string
  }
}

const DONATION_TYPES = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]

const formatDonationType = (type: string): string => {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

export function AppealForm({ appeal }: AppealFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(appeal?.title || "")
  const [slug, setSlug] = useState(appeal?.slug || "")
  const [summary, setSummary] = useState(appeal?.summary || "")
  const [framerUrl, setFramerUrl] = useState(appeal?.framerUrl || "")
  const [isActive, setIsActive] = useState(appeal?.isActive ?? true)
  const [donationTypesEnabled, setDonationTypesEnabled] = useState<string[]>(
    appeal?.donationTypesEnabled || ["GENERAL"]
  )
  const [allowMonthly, setAllowMonthly] = useState(appeal?.allowMonthly ?? false)
  const [allowYearly, setAllowYearly] = useState(appeal?.allowYearly ?? false)
  const [allowFundraising, setAllowFundraising] = useState(appeal?.allowFundraising ?? false)
  const [oneOffPresets, setOneOffPresets] = useState<string>(() => {
    if (appeal?.oneOffPresetAmountsPence) {
      try {
        const arr = JSON.parse(appeal.oneOffPresetAmountsPence) as number[]
        return arr.map((p) => (p / 100).toFixed(2)).join(", ")
      } catch {
        return ""
      }
    }
    return ""
  })
  const [monthlyPresets, setMonthlyPresets] = useState<string>(() => {
    if (appeal?.monthlyPresetAmountsPence) {
      try {
        const arr = JSON.parse(appeal.monthlyPresetAmountsPence) as number[]
        return arr.map((p) => (p / 100).toFixed(2)).join(", ")
      } catch {
        return ""
      }
    }
    return ""
  })
  const [yearlyPresets, setYearlyPresets] = useState<string>(() => {
    if (appeal?.yearlyPresetAmountsPence) {
      try {
        const arr = JSON.parse(appeal.yearlyPresetAmountsPence) as number[]
        return arr.map((p) => (p / 100).toFixed(2)).join(", ")
      } catch {
        return ""
      }
    }
    return ""
  })
  const [appealImages, setAppealImages] = useState<string[]>(() => {
    if (appeal?.appealImageUrls) {
      try {
        return JSON.parse(appeal.appealImageUrls)
      } catch {
        return []
      }
    }
    return []
  })
  const [fundraisingImages, setFundraisingImages] = useState<string[]>(() => {
    if (appeal?.fundraisingImageUrls) {
      try {
        return JSON.parse(appeal.fundraisingImageUrls)
      } catch {
        return []
      }
    }
    return []
  })
  const [uploading, setUploading] = useState(false)
  const [uploadingFundraising, setUploadingFundraising] = useState(false)

  const parsePresetInputToJsonPence = (input: string): string => {
    const raw = input
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean)

    if (raw.length === 0) return "[]"

    const pence: number[] = []
    for (const token of raw) {
      const amount = Number(token)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Invalid preset amount: "${token}"`)
      }
      pence.push(Math.round(amount * 100))
    }

    // de-dupe + sort ascending
    const uniqueSorted = Array.from(new Set(pence)).sort((a, b) => a - b)
    return JSON.stringify(uniqueSorted)
  }

  const toggleDonationType = (type: string) => {
    setDonationTypesEnabled((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    )
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/admin/appeals/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to upload: ${response.statusText}`)
      }

      const { url } = await response.json()
      if (!url) {
        throw new Error("No URL returned from upload")
      }
      setAppealImages((prev) => [...prev, url])
    } catch (error) {
      console.error("Image upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image"
      alert(errorMessage)
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const removeImage = (index: number) => {
    setAppealImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFundraisingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFundraising(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/admin/appeals/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to upload: ${response.statusText}`)
      }

      const { url } = await response.json()
      if (!url) {
        throw new Error("No URL returned from upload")
      }
      setFundraisingImages((prev) => [...prev, url])
    } catch (error) {
      console.error("Fundraising image upload error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image"
      alert(errorMessage)
    } finally {
      setUploadingFundraising(false)
      e.target.value = ""
    }
  }

  const removeFundraisingImage = (index: number) => {
    setFundraisingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (allowFundraising && fundraisingImages.length < 3) {
        alert("Please upload at least 3 fundraising images before enabling fundraising.")
        return
      }

      let oneOffPresetAmountsPence = "[]"
      let monthlyPresetAmountsPence = "[]"
      let yearlyPresetAmountsPence = "[]"
      try {
        oneOffPresetAmountsPence = parsePresetInputToJsonPence(oneOffPresets)
        monthlyPresetAmountsPence = parsePresetInputToJsonPence(monthlyPresets)
        yearlyPresetAmountsPence = parsePresetInputToJsonPence(yearlyPresets)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Invalid preset amounts"
        alert(msg)
        return
      }

      const url = appeal ? `/api/admin/appeals/${appeal.id}` : "/api/admin/appeals"
      const method = appeal ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          summary,
          framerUrl: framerUrl || null,
          isActive,
          donationTypesEnabled,
          allowMonthly,
          allowYearly,
          allowFundraising,
          appealImageUrls: JSON.stringify(appealImages),
          fundraisingImageUrls: JSON.stringify(fundraisingImages),
          monthlyPricePence: null,
          yearlyPricePence: null,
          oneOffPresetAmountsPence,
          monthlyPresetAmountsPence,
          yearlyPresetAmountsPence,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to save: ${response.statusText}`)
      }

      router.push("/admin/appeals")
      router.refresh()
    } catch (error) {
      console.error("Appeal save error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save appeal"
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground">
          This summary is shown on the public donation page (max 1 sentence recommended)
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="framerUrl">Framer URL (for &quot;Read full appeal details&quot; link)</Label>
        <Input
          id="framerUrl"
          type="url"
          value={framerUrl}
          onChange={(e) => setFramerUrl(e.target.value)}
          placeholder="https://alianah.org/appeal/..."
        />
        <p className="text-sm text-muted-foreground">
          Leave empty to hide the link on the public donation page
        </p>
      </div>
      <div className="space-y-2">
        <Label>Donation Types Enabled</Label>
        <div className="flex flex-wrap gap-2">
          {DONATION_TYPES.map((type) => {
            const isSelected = donationTypesEnabled.includes(type)
            return (
              <Button
                key={type}
                type="button"
                variant={isSelected ? "default" : "outline"}
                onClick={() => toggleDonationType(type)}
                className="h-9"
              >
                {formatDonationType(type)}
              </Button>
            )
          })}
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Frequency Options</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={allowMonthly ? "default" : "outline"}
              onClick={() => setAllowMonthly(!allowMonthly)}
              className="h-9"
            >
              Allow Monthly
            </Button>
            <Button
              type="button"
              variant={allowYearly ? "default" : "outline"}
              onClick={() => setAllowYearly(!allowYearly)}
              className="h-9"
            >
              Allow Yearly
            </Button>
          </div>
        </div>

        {allowMonthly && (
          <div className="space-y-2 border rounded-lg p-4">
            <div className="space-y-2 mt-4">
              <Label htmlFor="monthlyPresets">Monthly Preset Amounts (£)</Label>
              <Input
                id="monthlyPresets"
                placeholder="e.g. 10, 25, 50"
                value={monthlyPresets}
                onChange={(e) => setMonthlyPresets(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Comma-separated amounts shown as buttons for monthly donations.
              </p>
            </div>
          </div>
        )}

        {allowYearly && (
          <div className="space-y-2 border rounded-lg p-4">
            <div className="space-y-2 mt-4">
              <Label htmlFor="yearlyPresets">Yearly Preset Amounts (£)</Label>
              <Input
                id="yearlyPresets"
                placeholder="e.g. 120, 250, 500"
                value={yearlyPresets}
                onChange={(e) => setYearlyPresets(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Comma-separated amounts shown as buttons for yearly donations.
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2 border rounded-lg p-4">
        <Label htmlFor="oneOffPresets">One-off Preset Amounts (£)</Label>
        <Input
          id="oneOffPresets"
          placeholder="e.g. 10, 20, 50, 100"
          value={oneOffPresets}
          onChange={(e) => setOneOffPresets(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Comma-separated amounts shown as buttons for one-off donations.
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Appeal Status</Label>
          <Button
            type="button"
            variant={isActive ? "default" : "outline"}
            onClick={() => setIsActive(!isActive)}
            className="h-9"
          >
            {isActive ? "Active" : "Inactive"}
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Fundraising</Label>
          <Button
            type="button"
            variant={allowFundraising ? "default" : "outline"}
            onClick={() => setAllowFundraising(!allowFundraising)}
            className="h-9"
          >
            {allowFundraising ? "Fundraising Enabled" : "Fundraising Disabled"}
          </Button>
          <p className="text-sm text-muted-foreground">
            When enabled, supporters can create fundraising pages for this appeal
          </p>
        </div>
      </div>
      {allowFundraising && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fundraising Images</Label>
            <p className="text-sm text-muted-foreground">
              Upload at least 3 images to display as a slideshow on fundraising pages for this appeal
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFundraisingImageUpload}
              disabled={uploadingFundraising}
              className="cursor-pointer"
            />
            {uploadingFundraising && <p className="text-sm text-muted-foreground">Uploading...</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            {fundraisingImages.length}/3 minimum uploaded
          </p>
          {fundraisingImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {fundraisingImages.map((url, index) => (
                <div key={index} className="relative group">
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={url}
                      alt={`Fundraising image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFundraisingImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Appeal Images</Label>
          <p className="text-sm text-muted-foreground">
            Upload images to display on appeal and fundraising pages. First image will be shown on fundraising pages.
          </p>
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="cursor-pointer"
          />
          {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
        </div>
        {appealImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {appealImages.map((url, index) => (
              <div key={index} className="relative group">
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={url}
                    alt={`Appeal image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : appeal ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/appeals")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
