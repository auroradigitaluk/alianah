"use client"

import { useState, useCallback, forwardRef, useImperativeHandle, useRef } from "react"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { Plus, Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

export type QurbaniCountryRow = {
  id: string
  country: string
  fundraisingImageUrls?: string
  priceOneSeventhPence: number | null
  priceSmallPence: number | null
  priceLargePence: number | null
  labelOneSeventh: string | null
  labelSmall: string | null
  labelLarge: string | null
  isActive: boolean
  sortOrder: number
  _count?: { donations: number }
}

export type QurbaniTableRef = { openCreate: () => void }

export const QurbaniTable = forwardRef<QurbaniTableRef, {
  countries: QurbaniCountryRow[]
  onRefresh: () => void
  showNewButton?: boolean
}>(
  function QurbaniTable({ countries, onRefresh, showNewButton = true }, ref) {
  const [editing, setEditing] = useState<QurbaniCountryRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    country: "",
    priceOneSeventh: "", // pounds, e.g. "58" for £58
    priceSmall: "",
    priceLarge: "",
    labelOneSeventh: "",
    labelSmall: "",
    labelLarge: "",
    isActive: true,
    sortOrder: 0,
    fundraisingImageUrls: [] as string[],
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const penceToPounds = (pence: number | null): string =>
    pence != null ? (pence / 100).toString() : ""

  const openEdit = useCallback((row: QurbaniCountryRow) => {
    const parsedImages = (() => {
      if (!row.fundraisingImageUrls) return []
      try {
        const arr = JSON.parse(row.fundraisingImageUrls)
        return Array.isArray(arr) ? arr.filter((v): v is string => typeof v === "string" && Boolean(v.trim())) : []
      } catch {
        return []
      }
    })()
    setEditing(row)
    setForm({
      country: row.country,
      priceOneSeventh: penceToPounds(row.priceOneSeventhPence),
      priceSmall: penceToPounds(row.priceSmallPence),
      priceLarge: penceToPounds(row.priceLargePence),
      labelOneSeventh: row.labelOneSeventh ?? "",
      labelSmall: row.labelSmall ?? "",
      labelLarge: row.labelLarge ?? "",
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      fundraisingImageUrls: parsedImages,
    })
  }, [])

  const openCreate = useCallback(() => {
    setCreating(true)
    setForm({
      country: "",
      priceOneSeventh: "",
      priceSmall: "",
      priceLarge: "",
      labelOneSeventh: "Cow (1/7th)",
      labelSmall: "Sheep",
      labelLarge: "Cow",
      isActive: true,
      sortOrder: countries.length,
      fundraisingImageUrls: [],
    })
  }, [countries.length])

  useImperativeHandle(ref, () => ({ openCreate: openCreate }), [openCreate])

  const closeModal = useCallback(() => {
    setEditing(null)
    setCreating(false)
  }, [])

  const poundsToPence = (pounds: string): number | null => {
    if (pounds.trim() === "") return null
    const n = parseFloat(pounds.trim())
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
  }

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const payload = {
        country: form.country.trim(),
        priceOneSeventhPence: poundsToPence(form.priceOneSeventh),
        priceSmallPence: poundsToPence(form.priceSmall),
        priceLargePence: poundsToPence(form.priceLarge),
        labelOneSeventh: form.labelOneSeventh.trim() || null,
        labelSmall: form.labelSmall.trim() || null,
        labelLarge: form.labelLarge.trim() || null,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        fundraisingImageUrls: form.fundraisingImageUrls,
      }
      if (editing) {
        const res = await fetch(`/api/admin/qurbani/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error?.message || data?.error || "Failed to update")
        }
      } else {
        const res = await fetch("/api/admin/qurbani", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error?.message || data?.error || "Failed to create")
        }
      }
      closeModal()
      onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [editing, form, closeModal, onRefresh])

  const deleteCountry = useCallback(
    async (row: QurbaniCountryRow) => {
      if (!confirm(`Delete "${row.country}"? This will remove all associated donation records.`)) return
      try {
        const res = await fetch(`/api/admin/qurbani/${row.id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete")
        onRefresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to delete")
      }
    },
    [onRefresh]
  )

  const formatPrice = (p: number | null) => (p == null ? "—" : formatCurrency(p))

  const uploadImage = useCallback(async (file: File) => {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/fundraisers/upload", { method: "POST", body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.url) {
      throw new Error(data?.error || "Failed to upload image")
    }
    return String(data.url)
  }, [])

  const handleFilesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const selected = Array.from(files)
      try {
        setSaving(true)
        const uploadedUrls: string[] = []
        for (const file of selected) {
          const url = await uploadImage(file)
          uploadedUrls.push(url)
        }
        setForm((f) => ({
          ...f,
          fundraisingImageUrls: [...f.fundraisingImageUrls, ...uploadedUrls],
        }))
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to upload images")
      } finally {
        setSaving(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [uploadImage]
  )

  const removeImage = useCallback((idx: number) => {
    setForm((f) => ({
      ...f,
      fundraisingImageUrls: f.fundraisingImageUrls.filter((_, i) => i !== idx),
    }))
  }, [])

  return (
    <>
      {showNewButton && (
        <div className="flex justify-end mb-4">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New country
          </Button>
        </div>
      )}
      <AdminTable
        data={countries}
        columns={[
          {
            id: "country",
            header: "Country",
            cell: (row) => <span className="font-medium">{row.country}</span>,
          },
          {
            id: "oneSeventh",
            header: "1/7th",
            cell: (row) => (
              <div className="text-sm">
                <div>{formatPrice(row.priceOneSeventhPence)}</div>
                {row.labelOneSeventh && (
                  <div className="text-muted-foreground text-xs">{row.labelOneSeventh}</div>
                )}
              </div>
            ),
          },
          {
            id: "small",
            header: "Small",
            cell: (row) => (
              <div className="text-sm">
                <div>{formatPrice(row.priceSmallPence)}</div>
                {row.labelSmall && (
                  <div className="text-muted-foreground text-xs">{row.labelSmall}</div>
                )}
              </div>
            ),
          },
          {
            id: "large",
            header: "Large",
            cell: (row) => (
              <div className="text-sm">
                <div>{formatPrice(row.priceLargePence)}</div>
                {row.labelLarge && (
                  <div className="text-muted-foreground text-xs">{row.labelLarge}</div>
                )}
              </div>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: (row) => <StatusBadge isActive={row.isActive} />,
          },
          {
            id: "actions",
            header: "Actions",
            cell: (row) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteCountry(row)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ),
          },
        ]}
        enableSelection={false}
      />
      <Dialog open={!!editing || creating} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="p-6 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Qurbani country" : "New Qurbani country"}</DialogTitle>
            <DialogDescription>
              Set country name and prices for 1/7th, Small, and Large. Use labels for animal type (e.g. Cow, Sheep).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="e.g. Afghanistan"
              />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">1/7th price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                      £
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.priceOneSeventh}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, priceOneSeventh: e.target.value }))
                      }
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                  <Input
                    value={form.labelOneSeventh}
                    onChange={(e) => setForm((f) => ({ ...f, labelOneSeventh: e.target.value }))}
                    placeholder="Label (e.g. Cow 1/7th)"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">Small price (£)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                      £
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.priceSmall}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, priceSmall: e.target.value }))
                      }
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                  <Input
                    value={form.labelSmall}
                    onChange={(e) => setForm((f) => ({ ...f, labelSmall: e.target.value }))}
                    placeholder="Label (e.g. Sheep)"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Large price (£)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium pointer-events-none">
                    £
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.priceLarge}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priceLarge: e.target.value }))
                    }
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
                <Input
                  value={form.labelLarge}
                  onChange={(e) => setForm((f) => ({ ...f, labelLarge: e.target.value }))}
                  placeholder="Label (e.g. Cow)"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium text-foreground">
                  Fundraiser Images
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                >
                  Upload images
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void handleFilesSelected(e.target.files)}
              />
              {form.fundraisingImageUrls.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No images yet. These will be shown on fundraiser links for this country.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {form.fundraisingImageUrls.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="rounded-md border overflow-hidden">
                      <div className="relative aspect-[4/3] bg-muted">
                        <Image
                          src={url}
                          alt={`Fundraiser image ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                      </div>
                      <div className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive w-full"
                          onClick={() => removeImage(idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(c) => setForm((f) => ({ ...f, isActive: c === true }))}
              />
              <Label htmlFor="isActive" className="text-sm font-medium text-foreground">
                Active (show on public page)
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.country.trim()}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})
