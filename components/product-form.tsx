"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ProductFormProps {
  product?: {
    id: string
    name: string
    slug: string
    type: "FIXED" | "VARIABLE"
    unitLabel: string
    fixedAmountPence: number | null
    minAmountPence: number | null
    maxAmountPence: number | null
    isActive: boolean
  }
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(product?.name || "")
  const [slug, setSlug] = useState(product?.slug || "")
  const [type, setType] = useState<"FIXED" | "VARIABLE">(product?.type || "FIXED")
  const [unitLabel, setUnitLabel] = useState(product?.unitLabel || "")
  const [fixedAmountPence, setFixedAmountPence] = useState(
    product?.fixedAmountPence ? (product.fixedAmountPence / 100).toString() : ""
  )
  const [minAmountPence, setMinAmountPence] = useState(
    product?.minAmountPence ? (product.minAmountPence / 100).toString() : ""
  )
  const [maxAmountPence, setMaxAmountPence] = useState(
    product?.maxAmountPence ? (product.maxAmountPence / 100).toString() : ""
  )
  const [isActive, setIsActive] = useState(product?.isActive ?? true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = product ? `/api/admin/products/${product.id}` : "/api/admin/products"
      const method = product ? "PUT" : "POST"

      const payload: any = {
        name,
        slug,
        type,
        unitLabel,
        isActive,
      }

      if (type === "FIXED") {
        payload.fixedAmountPence = Math.round(parseFloat(fixedAmountPence) * 100)
      } else {
        payload.minAmountPence = minAmountPence
          ? Math.round(parseFloat(minAmountPence) * 100)
          : null
        payload.maxAmountPence = maxAmountPence
          ? Math.round(parseFloat(maxAmountPence) * 100)
          : null
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to save")

      router.push("/admin/products")
      router.refresh()
    } catch (error) {
      console.error(error)
      alert("Failed to save product")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select value={type} onValueChange={(value) => setType(value as "FIXED" | "VARIABLE")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FIXED">Fixed</SelectItem>
            <SelectItem value="VARIABLE">Variable</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="unitLabel">Unit Label</Label>
        <Input
          id="unitLabel"
          value={unitLabel}
          onChange={(e) => setUnitLabel(e.target.value)}
          required
        />
      </div>
      {type === "FIXED" ? (
        <div className="space-y-2">
          <Label htmlFor="fixedAmountPence">Amount (£)</Label>
          <Input
            id="fixedAmountPence"
            type="number"
            step="0.01"
            value={fixedAmountPence}
            onChange={(e) => setFixedAmountPence(e.target.value)}
            required
          />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="minAmountPence">Min Amount (£)</Label>
            <Input
              id="minAmountPence"
              type="number"
              step="0.01"
              value={minAmountPence}
              onChange={(e) => setMinAmountPence(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxAmountPence">Max Amount (£)</Label>
            <Input
              id="maxAmountPence"
              type="number"
              step="0.01"
              value={maxAmountPence}
              onChange={(e) => setMaxAmountPence(e.target.value)}
            />
          </div>
        </>
      )}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Active
        </Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : product ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
