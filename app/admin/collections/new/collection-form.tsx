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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Masjid = { id: string; name: string }
type Appeal = { id: string; title: string }

const COLLECTION_TYPES = [
  { value: "JUMMAH", label: "Jummah" },
  { value: "RAMADAN", label: "Ramadan" },
  { value: "EID", label: "Eid" },
  { value: "SPECIAL", label: "Special" },
  { value: "OTHER", label: "Other" },
]

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
  const [masjidQuery, setMasjidQuery] = React.useState("")
  const [masjidOpen, setMasjidOpen] = React.useState(false)
  const [appealId, setAppealId] = React.useState<string>("__none__")
  const [sadaqah, setSadaqah] = React.useState("")
  const [zakat, setZakat] = React.useState("")
  const [lillah, setLillah] = React.useState("")
  const [card, setCard] = React.useState("")
  const [type, setType] = React.useState("JUMMAH")
  const [collectedAt, setCollectedAt] = React.useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 16)
  })
  const [notes, setNotes] = React.useState("")

  const toPence = (val: string) => Math.round((parseFloat(val) || 0) * 100)
  const totalPence = toPence(sadaqah) + toPence(zakat) + toPence(lillah) + toPence(card)
  const totalDisplay = (totalPence / 100).toFixed(2)

  const selectedMasjid = masjidId && masjidId !== "__none__"
    ? masjids.find((m) => m.id === masjidId)
    : null
  const filteredMasjids = React.useMemo(() => {
    const q = masjidQuery.trim().toLowerCase()
    if (!q) return masjids
    return masjids.filter((m) => m.name.toLowerCase().includes(q))
  }, [masjids, masjidQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (totalPence <= 0) {
      toast.error("Enter at least one amount")
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
          sadaqahPence: toPence(sadaqah),
          zakatPence: toPence(zakat),
          lillahPence: toPence(lillah),
          cardPence: toPence(card),
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
        <Popover open={masjidOpen} onOpenChange={setMasjidOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={masjidOpen}
              className={cn(
                "w-full justify-between font-normal",
                !selectedMasjid && "text-muted-foreground"
              )}
            >
              {selectedMasjid ? selectedMasjid.name : "Select masjid (optional)"}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="Search masjid..."
                transform="titleCase"
                value={masjidQuery}
                onChange={(e) => setMasjidQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-9"
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto p-1">
              <button
                type="button"
                className={cn(
                  "w-full px-2 py-2 text-left text-sm rounded-sm hover:bg-accent",
                  masjidId === "__none__" && "bg-accent"
                )}
                onClick={() => {
                  setMasjidId("__none__")
                  setMasjidOpen(false)
                  setMasjidQuery("")
                }}
              >
                None
              </button>
              {filteredMasjids.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={cn(
                    "w-full px-2 py-2 text-left text-sm rounded-sm hover:bg-accent",
                    masjidId === m.id && "bg-accent"
                  )}
                  onClick={() => {
                    setMasjidId(m.id)
                    setMasjidOpen(false)
                    setMasjidQuery("")
                  }}
                >
                  {m.name}
                </button>
              ))}
              {filteredMasjids.length === 0 && masjidQuery && (
                <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                  No masjid found
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
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
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="sadaqah">Sadaqah (£)</Label>
          <Input
            id="sadaqah"
            type="number"
            step="0.01"
            min="0"
            value={sadaqah}
            onChange={(e) => setSadaqah(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zakat">Zakat (£)</Label>
          <Input
            id="zakat"
            type="number"
            step="0.01"
            min="0"
            value={zakat}
            onChange={(e) => setZakat(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lillah">Lillah (£)</Label>
          <Input
            id="lillah"
            type="number"
            step="0.01"
            min="0"
            value={lillah}
            onChange={(e) => setLillah(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="card">Card (£)</Label>
          <Input
            id="card"
            type="number"
            step="0.01"
            min="0"
            value={card}
            onChange={(e) => setCard(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Total (£)</Label>
          <Input value={totalDisplay} readOnly className="bg-muted font-semibold" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Collection type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLLECTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          transform="titleCase"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving || totalPence <= 0}>
          {saving ? "Creating..." : "Create collection"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/collections")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
