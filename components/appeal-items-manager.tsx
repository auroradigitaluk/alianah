"use client"

import * as React from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ArrowDown, ArrowUp, Trash2, Save, Plus } from "lucide-react"

type Item = {
  productId: string
  sortOrder: number
  name: string
  slug: string
  unitLabel: string
  pricePence: number
  isActive: boolean
  donationCount: number
}

const toPounds = (p: number) => (p / 100).toFixed(2)
const toPence = (s: string) => Math.round(parseFloat(s) * 100)

/** Admin: manage fixed-price items (e.g. Winter Appeal blankets/tents) on an appeal. */
export function AppealItemsManager({ appealId, appealSlug }: { appealId: string; appealSlug: string }) {
  const [items, setItems] = React.useState<Item[]>([])
  const [drafts, setDrafts] = React.useState<Record<string, { name: string; price: string }>>({})
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newPrice, setNewPrice] = React.useState("")

  const api = `/api/admin/appeals/${appealId}/items`

  const apply = (list: Item[]) => {
    setItems(list)
    setDrafts(Object.fromEntries(list.map((i) => [i.productId, { name: i.name, price: toPounds(i.pricePence) }])))
  }

  const call = async (method: string, body?: unknown, query = "") => {
    setBusy(true)
    try {
      const res = await fetch(api + query, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Request failed")
      apply(json.items)
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed")
      return false
    } finally {
      setBusy(false)
    }
  }

  React.useEffect(() => {
    call("GET").finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appealId])

  const add = async () => {
    const pence = toPence(newPrice)
    if (!newName.trim() || !Number.isFinite(pence) || pence <= 0) {
      toast.error("Enter an item name and a valid price")
      return
    }
    if (await call("POST", { name: newName.trim(), pricePence: pence })) {
      setNewName("")
      setNewPrice("")
      toast.success("Item added")
    }
  }

  const save = async (i: Item) => {
    const d = drafts[i.productId]
    const pence = toPence(d.price)
    if (!d.name.trim() || !Number.isFinite(pence) || pence <= 0) {
      toast.error("Enter a valid name and price")
      return
    }
    if (await call("PATCH", { productId: i.productId, name: d.name.trim(), pricePence: pence })) toast.success("Saved")
  }

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= items.length) return
    const a = items[idx]
    const b = items[j]
    await call("PATCH", { productId: a.productId, sortOrder: j })
    await call("PATCH", { productId: b.productId, sortOrder: idx })
  }

  const remove = async (i: Item) => {
    const msg =
      i.donationCount > 0
        ? `"${i.name}" has ${i.donationCount} donation(s). It will be hidden (not deleted) to keep reports intact. Continue?`
        : `Delete "${i.name}"?`
    if (!confirm(msg)) return
    if (await call("DELETE", undefined, `?productId=${encodeURIComponent(i.productId)}`)) toast.success("Done")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appeal Items</CardTitle>
        <CardDescription>
          Fixed-price items donors can pick with a quantity (e.g. Blanket £28.89 × 3). Shown on{" "}
          <code>/appeal/{appealSlug}</code>. Deep link to an item: <code>/appeal/{appealSlug}?item=&lt;item-slug&gt;</code>.
          Leave empty for a normal appeal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          items.map((i, idx) => (
            <div key={i.productId} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" disabled={busy || idx === 0} onClick={() => move(idx, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" disabled={busy || idx === items.length - 1} onClick={() => move(idx, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  value={drafts[i.productId]?.name ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [i.productId]: { ...d[i.productId], name: e.target.value } }))}
                />
                <p className="text-xs text-muted-foreground">
                  slug: {i.slug} · {i.donationCount} donation(s)
                </p>
              </div>
              <div className="relative w-full sm:w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="pl-7"
                  value={drafts[i.productId]?.price ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [i.productId]: { ...d[i.productId], price: e.target.value } }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={i.isActive}
                  disabled={busy}
                  onCheckedChange={(v) => call("PATCH", { productId: i.productId, isActive: v })}
                />
                <span className="text-xs w-12">{i.isActive ? "Live" : "Hidden"}</span>
                <Button type="button" size="icon" variant="outline" disabled={busy} onClick={() => save(i)} title="Save">
                  <Save className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" disabled={busy} onClick={() => remove(i)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
          <Input placeholder="New item name (e.g. Blanket)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div className="relative w-full sm:w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
            <Input type="number" step="0.01" min="0.01" placeholder="0.00" className="pl-7" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          </div>
          <Button type="button" onClick={add} disabled={busy}>
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
