"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { slugify } from "@/lib/masjid-shared"

export interface MasjidProjectFormValues {
  id?: string
  country: string
  slug: string
  title: string
  summary: string
  content: string | null
  priceFromPence: number
  priceToPence: number | null
  priceNote: string | null
  imageUrls: string[]
  fundraisingImageUrls: string[]
  fundraisingDefaultMessage: string | null
  allowFundraising: boolean
  allowPartialDonations: boolean
  framerUrl: string | null
  isActive: boolean
}

const penceToPounds = (pence: number | null | undefined) =>
  pence != null ? (pence / 100).toString() : ""

export function MasjidProjectForm({ initial }: { initial?: MasjidProjectFormValues }) {
  const router = useRouter()
  const isEdit = Boolean(initial?.id)

  const [country, setCountry] = React.useState(initial?.country ?? "")
  const [slugTouched, setSlugTouched] = React.useState(isEdit)
  const [slug, setSlug] = React.useState(initial?.slug ?? "")
  const [title, setTitle] = React.useState(initial?.title ?? "")
  const [summary, setSummary] = React.useState(initial?.summary ?? "")
  const [content, setContent] = React.useState(initial?.content ?? "")
  const [priceFrom, setPriceFrom] = React.useState(penceToPounds(initial?.priceFromPence))
  const [priceTo, setPriceTo] = React.useState(penceToPounds(initial?.priceToPence))
  const [priceNote, setPriceNote] = React.useState(initial?.priceNote ?? "")
  const [images, setImages] = React.useState<string[]>(initial?.imageUrls ?? [])
  const [fundraisingImages, setFundraisingImages] = React.useState<string[]>(
    initial?.fundraisingImageUrls ?? []
  )
  const [fundraisingDefaultMessage, setFundraisingDefaultMessage] = React.useState(
    initial?.fundraisingDefaultMessage ?? ""
  )
  const [allowFundraising, setAllowFundraising] = React.useState(initial?.allowFundraising ?? true)
  const [allowPartialDonations, setAllowPartialDonations] = React.useState(
    initial?.allowPartialDonations ?? true
  )
  const [framerUrl, setFramerUrl] = React.useState(initial?.framerUrl ?? "")
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true)

  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const effectiveSlug = slugTouched ? slug : slugify(country)

  async function uploadFiles(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error("Please upload image files only.")
          continue
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5MB.`)
          continue
        }
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/admin/appeals/upload", { method: "POST", body: formData })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.url) {
          toast.error(data.error || "Failed to upload image")
          continue
        }
        setter((prev) => [...prev, data.url])
      }
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const priceFromPence = Math.round(parseFloat(priceFrom.replace(",", ".")) * 100)
    if (!country.trim() || !title.trim() || !summary.trim()) {
      toast.error("Country, title and summary are required.")
      return
    }
    if (!Number.isFinite(priceFromPence) || priceFromPence <= 0) {
      toast.error("Enter a valid full masjid price.")
      return
    }
    const priceToPence = priceTo.trim()
      ? Math.round(parseFloat(priceTo.replace(",", ".")) * 100)
      : null
    if (priceToPence != null && (!Number.isFinite(priceToPence) || priceToPence <= priceFromPence)) {
      toast.error("Price range top must be higher than the full masjid price.")
      return
    }
    if (allowFundraising && fundraisingImages.length < 1) {
      toast.error("Add at least 1 fundraising image when fundraising is enabled.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        country: country.trim(),
        slug: effectiveSlug,
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim() || null,
        priceFromPence,
        priceToPence,
        priceNote: priceNote.trim() || null,
        imageUrls: images,
        fundraisingImageUrls: fundraisingImages,
        fundraisingDefaultMessage: fundraisingDefaultMessage.trim() || null,
        allowFundraising,
        allowPartialDonations,
        framerUrl: framerUrl.trim() || null,
        isActive,
      }
      const res = await fetch(
        isEdit ? `/api/admin/masjid-donations/${initial!.id}` : "/api/admin/masjid-donations",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save")
      }
      toast.success(isEdit ? "Masjid country updated" : "Masjid country created")
      router.push("/admin/masjid-donations")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const ImageGrid = ({
    urls,
    setter,
  }: {
    urls: string[]
    setter: React.Dispatch<React.SetStateAction<string[]>>
  }) =>
    urls.length > 0 ? (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url) => (
          <div key={url} className="relative aspect-video overflow-hidden rounded-md border bg-muted">
            <Image src={url} alt="" fill className="object-cover" sizes="200px" />
            <button
              type="button"
              onClick={() => setter((prev) => prev.filter((u) => u !== url))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    ) : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
              if (!title.trim()) setTitle(`Build a Masjid in ${e.target.value}`)
            }}
            placeholder="Uganda"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL slug *</Label>
          <Input
            id="slug"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(slugify(e.target.value))
            }}
            placeholder="uganda"
          />
          <p className="text-xs text-muted-foreground">/masjids/{effectiveSlug || "…"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Summary *</Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Short line shown on the card and page header"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Description</Label>
        <Textarea
          id="content"
          value={content ?? ""}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="What's included, capacity, impact…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="priceFrom">Full masjid price (£) *</Label>
          <Input
            id="priceFrom"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            placeholder="7000"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceTo">Price range top (£)</Label>
          <Input
            id="priceTo"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={priceTo}
            onChange={(e) => setPriceTo(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceNote">Price note</Label>
          <Input
            id="priceNote"
            value={priceNote ?? ""}
            onChange={(e) => setPriceNote(e.target.value)}
            placeholder="Depending on size"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Page images</Label>
        <Input type="file" accept="image/*" multiple onChange={(e) => uploadFiles(e, setImages)} disabled={uploading} />
        <ImageGrid urls={images} setter={setImages} />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <Label className="mr-auto">Fundraising</Label>
        <Button
          type="button"
          variant={allowFundraising ? "default" : "outline"}
          size="sm"
          onClick={() => setAllowFundraising((v) => !v)}
        >
          {allowFundraising ? "Enabled" : "Disabled"}
        </Button>
      </div>

      {allowFundraising && (
        <div className="space-y-4 rounded-lg border p-3">
          <div className="space-y-2">
            <Label htmlFor="fundraisingDefaultMessage">Fundraising default description</Label>
            <Textarea
              id="fundraisingDefaultMessage"
              value={fundraisingDefaultMessage ?? ""}
              onChange={(e) => setFundraisingDefaultMessage(e.target.value)}
              rows={4}
              placeholder="Prefilled story on a fundraiser's page"
            />
          </div>
          <div className="space-y-2">
            <Label>Fundraising images (min 1)</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => uploadFiles(e, setFundraisingImages)}
              disabled={uploading}
            />
            <ImageGrid urls={fundraisingImages} setter={setFundraisingImages} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <Label className="mr-auto">Allow partial donations (contribute any amount)</Label>
        <Button
          type="button"
          variant={allowPartialDonations ? "default" : "outline"}
          size="sm"
          onClick={() => setAllowPartialDonations((v) => !v)}
        >
          {allowPartialDonations ? "Allowed" : "Full price only"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="framerUrl">Framer URL (optional &ldquo;Read more&rdquo; link)</Label>
        <Input
          id="framerUrl"
          value={framerUrl ?? ""}
          onChange={(e) => setFramerUrl(e.target.value)}
          placeholder="https://alianah.org/…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <Label className="mr-auto">Status</Label>
        <Button
          type="button"
          variant={isActive ? "default" : "outline"}
          size="sm"
          onClick={() => setIsActive((v) => !v)}
        >
          {isActive ? "Active" : "Hidden"}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || uploading}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create country"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/masjid-donations")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
