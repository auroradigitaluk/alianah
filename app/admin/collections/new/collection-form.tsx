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

type Masjid = { id: string; name: string; email?: string | null; emailAlt?: string | null }
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
  const [otherLocationName, setOtherLocationName] = React.useState("")
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
  const [receiptEmail, setReceiptEmail] = React.useState("")

  const toPence = (val: string) => Math.round((parseFloat(val) || 0) * 100)
  const totalPence = toPence(sadaqah) + toPence(zakat) + toPence(lillah) + toPence(card)
  const totalDisplay = (totalPence / 100).toFixed(2)

  const selectedMasjid = masjidId && masjidId !== "__none__"
    ? masjids.find((m) => m.id === masjidId)
    : null

  React.useEffect(() => {
    if (selectedMasjid) {
      const prefilled = selectedMasjid.email?.trim() || selectedMasjid.emailAlt?.trim() || ""
      setReceiptEmail(prefilled)
    } else {
      setReceiptEmail("")
    }
  }, [selectedMasjid])

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
          otherLocationName: otherLocationName.trim() || null,
          appealId: appealId && appealId !== "__none__" ? appealId : null,
          sadaqahPence: toPence(sadaqah),
          zakatPence: toPence(zakat),
          lillahPence: toPence(lillah),
          cardPence: toPence(card),
          type,
          collectedAt: new Date(collectedAt).toISOString(),
          notes: notes.trim() || null,
          receiptEmail: receiptEmail.trim() || undefined,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="masjid">Masjid</Label>
          <Popover open={masjidOpen} onOpenChange={setMasjidOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={masjidOpen}
                className={cn(
                  "border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 hover:bg-muted/50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-50",
                  !selectedMasjid && "text-muted-foreground"
                )}
              >
                <span className="line-clamp-1 flex items-center gap-2">
                  {selectedMasjid ? selectedMasjid.name : "Select masjid (optional)"}
                </span>
                <ChevronDown className="size-4 shrink-0 opacity-50" />
              </button>
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
                    "w-full px-2 py-2 text-left text-sm rounded-sm hover:bg-muted/50",
                    masjidId === "__none__" && "bg-muted"
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
                      "w-full px-2 py-2 text-left text-sm rounded-sm hover:bg-muted/50",
                      masjidId === m.id && "bg-muted"
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
          <Label htmlFor="other-location">Other location</Label>
          <Input
            id="other-location"
            placeholder="e.g. shop, event venue (optional)"
            value={otherLocationName}
            onChange={(e) => setOtherLocationName(e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="receiptEmail">Email for receipt (optional)</Label>
          <Input
            id="receiptEmail"
            type="email"
            value={receiptEmail}
            onChange={(e) => setReceiptEmail(e.target.value)}
            placeholder="Send collection receipt to this email"
          />
          {selectedMasjid && (selectedMasjid.email || selectedMasjid.emailAlt) && (
            <p className="text-xs text-muted-foreground">
              Prefilled from masjid contact. Edit if needed.
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor="sadaqah">Sadaqah (£)</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs overflow-hidden">
            <span className="pl-3 text-muted-foreground text-sm">£</span>
            <Input
              id="sadaqah"
              type="number"
              step="0.01"
              min="0"
              value={sadaqah}
              onChange={(e) => setSadaqah(e.target.value)}
              placeholder="0.00"
              className="border-0 shadow-none min-w-0 flex-1 rounded-none py-1 pr-3 pl-1 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="zakat">Zakat (£)</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs overflow-hidden">
            <span className="pl-3 text-muted-foreground text-sm">£</span>
            <Input
              id="zakat"
              type="number"
              step="0.01"
              min="0"
              value={zakat}
              onChange={(e) => setZakat(e.target.value)}
              placeholder="0.00"
              className="border-0 shadow-none min-w-0 flex-1 rounded-none py-1 pr-3 pl-1 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lillah">Lillah (£)</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs overflow-hidden">
            <span className="pl-3 text-muted-foreground text-sm">£</span>
            <Input
              id="lillah"
              type="number"
              step="0.01"
              min="0"
              value={lillah}
              onChange={(e) => setLillah(e.target.value)}
              placeholder="0.00"
              className="border-0 shadow-none min-w-0 flex-1 rounded-none py-1 pr-3 pl-1 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="card">Card (£)</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs overflow-hidden">
            <span className="pl-3 text-muted-foreground text-sm">£</span>
            <Input
              id="card"
              type="number"
              step="0.01"
              min="0"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              placeholder="0.00"
              className="border-0 shadow-none min-w-0 flex-1 rounded-none py-1 pr-3 pl-1 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Total (£)</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-muted shadow-xs overflow-hidden">
            <span className="pl-3 text-muted-foreground text-sm">£</span>
            <Input value={totalDisplay} readOnly className="border-0 shadow-none min-w-0 flex-1 rounded-none py-1 pr-3 pl-1 h-9 bg-transparent font-semibold" />
          </div>
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
