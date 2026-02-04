"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type Masjid = { id: string; name: string }
type Appeal = { id: string; title: string }

export function CollectionForm({
  masjids,
  appeals,
}: {
  masjids: Masjid[]
  appeals: Appeal[]
}) {
  const router = useRouter()
  const [saving, setSaving] = React.useState(false)
  const [masjidId, setMasjidId] = React.useState<string>("__none__")
  const [appealId, setAppealId] = React.useState<string>("__none__")
  const [amountPence, setAmountPence] = React.useState("")
  const [donationType, setDonationType] = React.useState("GENERAL")
  const [type, setType] = React.useState("JUMMAH")
  const [collectedAt, setCollectedAt] = React.useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 16)
  })
  const [notes, setNotes] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Math.round(parseFloat(amountPence) * 100)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masjidId: masjidId && masjidId !== "__none__" ? masjidId : null,
          appealId: appealId && appealId !== "__none__" ? appealId : null,
          amountPence: amount,
          donationType,
          type,
          collectedAt: new Date(collectedAt).toISOString(),
          notes: notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create")
      }

      toast.success("Collection created")
      router.push("/admin/collections")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create collection")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="masjid">Masjid</Label>
        <Select value={masjidId} onValueChange={setMasjidId}>
          <SelectTrigger id="masjid">
            <SelectValue placeholder="Select masjid (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {masjids.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="appeal">Appeal</Label>
        <Select value={appealId} onValueChange={setAppealId}>
          <SelectTrigger id="appeal">
            <SelectValue placeholder="Select appeal (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {appeals.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (£)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amountPence}
            onChange={(e) => setAmountPence(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collectedAt">Collected at</Label>
          <Input
            id="collectedAt"
            type="datetime-local"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="donationType">Donation type</Label>
          <Select value={donationType} onValueChange={setDonationType}>
            <SelectTrigger id="donationType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">General</SelectItem>
              <SelectItem value="SADAQAH">Sadaqah</SelectItem>
              <SelectItem value="ZAKAT">Zakat</SelectItem>
              <SelectItem value="LILLAH">Lillah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Collection type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="JUMMAH">Jummah</SelectItem>
              <SelectItem value="RAMADAN">Ramadan</SelectItem>
              <SelectItem value="EID">Eid</SelectItem>
              <SelectItem value="SPECIAL">Special</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create collection"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/collections")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
