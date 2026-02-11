"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconCalendarEvent } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Wallet, Calendar, Target, FileText, StickyNote, User, Pencil, Trash2, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const DONATION_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
]

const COLLECTION_TYPES = [
  { value: "JUMMAH", label: "Jummah" },
  { value: "RAMADAN", label: "Ramadan" },
  { value: "EID", label: "Eid" },
  { value: "SPECIAL", label: "Special" },
  { value: "OTHER", label: "Other" },
]

const COLLECTION_TYPE_STYLES: Record<string, string> = {
  JUMMAH: "bg-primary text-primary-foreground border-primary",
  RAMADAN: "bg-blue-500 text-white border-blue-500",
  EID: "bg-orange-500 text-white border-orange-500",
  SPECIAL: "bg-orange-500 text-white border-orange-500",
  OTHER: "bg-pink-500 text-white border-pink-500",
}

interface Collection {
  id: string
  amountPence: number
  donationType: string
  type: string
  collectedAt: Date
  masjidId?: string | null
  appealId?: string | null
  masjid?: { name: string } | null
  appeal?: { title: string } | null
  notes?: string | null
  addedByName?: string | null
}

type MasjidOption = { id: string; name: string }
type AppealOption = { id: string; title: string }

export function CollectionsTable({
  collections,
  showLoggedBy = true,
  canEdit = false,
  masjids = [],
  appeals = [],
}: {
  collections: Collection[]
  showLoggedBy?: boolean
  canEdit?: boolean
  masjids?: MasjidOption[]
  appeals?: AppealOption[]
}) {
  const router = useRouter()
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Collection | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [appealQuery, setAppealQuery] = useState("")
  const [masjidQuery, setMasjidQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const typeOptions = useMemo(
    () => Array.from(new Set(collections.map((item) => item.type))).sort(),
    [collections]
  )

  const filteredCollections = useMemo(() => {
    const normalizedAppeal = appealQuery.trim().toLowerCase()
    const normalizedMasjid = masjidQuery.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    if (from) from.setHours(0, 0, 0, 0)
    if (to) to.setHours(23, 59, 59, 999)

    return collections.filter((item) => {
      const appealName = (item.appeal?.title || "General").toLowerCase()
      const masjidName = (item.masjid?.name || "No masjid").toLowerCase()
      const matchesAppeal = normalizedAppeal
        ? appealName.includes(normalizedAppeal)
        : true
      const matchesMasjid = normalizedMasjid
        ? masjidName.includes(normalizedMasjid)
        : true
      const matchesType = typeFilter === "all" || item.type === typeFilter
      const dateValue = item.collectedAt ? new Date(item.collectedAt) : null
      const matchesDate =
        (!from || (dateValue && dateValue >= from)) &&
        (!to || (dateValue && dateValue <= to))

      return matchesAppeal && matchesMasjid && matchesType && matchesDate
    })
  }, [appealQuery, collections, fromDate, masjidQuery, toDate, typeFilter])

  const clearFilters = () => {
    setAppealQuery("")
    setMasjidQuery("")
    setTypeFilter("all")
    setFromDate("")
    setToDate("")
  }

  const handleSaveEdit = async (data: {
    masjidId: string | null
    appealId: string | null
    amountPence: number
    donationType: string
    type: string
    collectedAt: string
    notes: string | null
  }) => {
    if (!editingCollection) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/collections/${editingCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masjidId: data.masjidId || null,
          appealId: data.appealId || null,
          amountPence: data.amountPence,
          donationType: data.donationType,
          type: data.type,
          collectedAt: data.collectedAt,
          notes: data.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update")
      }
      toast.success("Updated")
      setEditingCollection(null)
      setSelectedCollection(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/collections/${deleteConfirm.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Deleted")
      setDeleteConfirm(null)
      setSelectedCollection(null)
      router.refresh()
    } catch {
      toast.error("Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="collections-masjid">Masjid</Label>
            <Input
              id="collections-masjid"
              transform="titleCase"
              placeholder="Search masjid"
              value={masjidQuery}
              onChange={(event) => setMasjidQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collections-appeal">Appeal</Label>
            <Input
              id="collections-appeal"
              transform="titleCase"
              placeholder="Search appeal"
              value={appealQuery}
              onChange={(event) => setAppealQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEnum(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="collections-from">From</Label>
            <Input
              id="collections-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collections-to">To</Label>
            <Input
              id="collections-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
      <AdminTable
        data={filteredCollections}
        onRowClick={(item) => setSelectedCollection(item)}
        columns={[
        {
          id: "masjid",
          header: "Masjid Name",
          cell: (item) => (
            <div className="font-medium">
              {item.masjid?.name || "No masjid"}
            </div>
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: (item) => (
            <div className="font-medium">
              {formatCurrency(item.amountPence)}
            </div>
          ),
        },
        {
          id: "type",
          header: "Type",
          cell: (item) => (
            <Badge
              variant="outline"
              className={`px-1.5 ${COLLECTION_TYPE_STYLES[item.type] || ""}`}
            >
              <IconCalendarEvent className="mr-1 size-3" />
              {formatEnum(item.type)}
            </Badge>
          ),
        },
        {
          id: "appeal",
          header: "Appeal",
          cell: (item) => (
            <div className="text-sm">
              {item.appeal?.title || "General"}
            </div>
          ),
        },
        {
          id: "date",
          header: "Date",
          cell: (item) => (
            <div className="text-sm">
              {formatDate(item.collectedAt)}
            </div>
          ),
        },
        ...(showLoggedBy
          ? [
              {
                id: "loggedBy" as const,
                header: "Logged by",
                cell: (item: Collection) => (
                  <div className="text-sm text-muted-foreground">
                    {item.addedByName || "—"}
                  </div>
                ),
              },
            ]
          : []),
      ]}
      />
      <Dialog
        open={!!selectedCollection}
        onOpenChange={(open) => !open && setSelectedCollection(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Collection Details
                </DialogTitle>
                <DialogDescription>
                  {selectedCollection && `${formatCurrency(selectedCollection.amountPence)} collected from ${selectedCollection.masjid?.name || "No masjid"}`}
                </DialogDescription>
              </div>
              {canEdit && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingCollection(selectedCollection)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(selectedCollection)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedCollection && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Amount
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(selectedCollection.amountPence)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Type
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <Badge
                            variant="outline"
                            className={`px-1.5 ${COLLECTION_TYPE_STYLES[selectedCollection.type] || ""}`}
                          >
                            <IconCalendarEvent className="mr-1 size-3" />
                            {formatEnum(selectedCollection.type)}
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />

                    {/* Collection Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Collection Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Masjid
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedCollection.masjid?.name || "No masjid"}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Appeal
                              </p>
                              <p className="text-base text-foreground">{selectedCollection.appeal?.title || "General"}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Donation Type
                              </p>
                              <p className="text-base text-foreground">{formatEnum(selectedCollection.donationType)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Date Collected
                              </p>
                              <p className="text-base text-foreground">{formatDateTime(selectedCollection.collectedAt)}</p>
                            </div>
                          </div>
                          {showLoggedBy && selectedCollection.addedByName && (
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Logged by
                              </p>
                              <p className="text-base text-foreground">{selectedCollection.addedByName}</p>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedCollection.notes && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 pb-2">
                            <div className="p-2 rounded-lg bg-muted/50">
                              <StickyNote className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Notes</h3>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/30">
                            <p className="text-base text-foreground">{selectedCollection.notes}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingCollection} onOpenChange={(open) => !open && setEditingCollection(null)}>
        <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit collection</DialogTitle>
            <DialogDescription>
              Update the details below. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          {editingCollection && (
            <CollectionEditForm
              collection={editingCollection}
              masjids={masjids}
              appeals={appeals}
              onSave={handleSaveEdit}
              onCancel={() => setEditingCollection(null)}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>
              This will permanently remove this collection entry. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CollectionEditForm({
  collection,
  masjids,
  appeals,
  onSave,
  onCancel,
  saving,
}: {
  collection: Collection
  masjids: MasjidOption[]
  appeals: AppealOption[]
  onSave: (data: {
    masjidId: string | null
    appealId: string | null
    amountPence: number
    donationType: string
    type: string
    collectedAt: string
    notes: string | null
  }) => void
  onCancel: () => void
  saving: boolean
}) {
  const toPence = (val: string) => Math.round((parseFloat(val) || 0) * 100)
  const amountStr = (collection.amountPence / 100).toFixed(2)
  const [masjidId, setMasjidId] = useState(collection.masjidId ?? "__none__")
  const [masjidQuery, setMasjidQuery] = useState("")
  const [masjidOpen, setMasjidOpen] = useState(false)
  const [appealId, setAppealId] = useState(collection.appealId ?? "__none__")
  const [sadaqah, setSadaqah] = useState(collection.donationType === "SADAQAH" ? amountStr : "")
  const [zakat, setZakat] = useState(collection.donationType === "ZAKAT" ? amountStr : "")
  const [lillah, setLillah] = useState(collection.donationType === "LILLAH" ? amountStr : "")
  const [card, setCard] = useState(collection.donationType === "GENERAL" ? amountStr : "")
  const [type, setType] = useState(collection.type)
  const [collectedAt, setCollectedAt] = useState(() => {
    const d = new Date(collection.collectedAt)
    return d.toISOString().slice(0, 16)
  })
  const [notes, setNotes] = useState(collection.notes ?? "")

  const totalPence = toPence(sadaqah) + toPence(zakat) + toPence(lillah) + toPence(card)
  const totalDisplay = (totalPence / 100).toFixed(2)

  const selectedMasjid = masjidId && masjidId !== "__none__"
    ? masjids.find((m) => m.id === masjidId)
    : null
  const filteredMasjids = useMemo(() => {
    const q = masjidQuery.trim().toLowerCase()
    if (!q) return masjids
    return masjids.filter((m) => m.name.toLowerCase().includes(q))
  }, [masjids, masjidQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const s = toPence(sadaqah)
    const z = toPence(zakat)
    const l = toPence(lillah)
    const c = toPence(card)
    let amountPence = 0
    let donationType = "GENERAL"
    if (s > 0) {
      amountPence = s
      donationType = "SADAQAH"
    } else if (z > 0) {
      amountPence = z
      donationType = "ZAKAT"
    } else if (l > 0) {
      amountPence = l
      donationType = "LILLAH"
    } else if (c > 0) {
      amountPence = c
      donationType = "GENERAL"
    }
    if (amountPence <= 0) return
    onSave({
      masjidId: masjidId && masjidId !== "__none__" ? masjidId : null,
      appealId: appealId && appealId !== "__none__" ? appealId : null,
      amountPence,
      donationType,
      type,
      collectedAt: new Date(collectedAt).toISOString(),
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-masjid" className="text-sm font-medium text-foreground">Masjid</Label>
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
          <Label htmlFor="edit-appeal" className="text-sm font-medium text-foreground">Appeal</Label>
          <Select value={appealId} onValueChange={setAppealId}>
            <SelectTrigger id="edit-appeal" className="w-full">
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
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Collection Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {COLLECTION_TYPES.map((t) => (
            <Button
              key={t.value}
              type="button"
              variant={type === t.value ? "default" : "outline"}
              onClick={() => setType(t.value)}
              className="h-11"
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Amounts (GBP)</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-sadaqah" className="text-muted-foreground font-normal">Sadaqah</Label>
            <Input
              id="edit-sadaqah"
              type="number"
              step="0.01"
              min="0"
              value={sadaqah}
              onChange={(e) => setSadaqah(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-zakat" className="text-muted-foreground font-normal">Zakat</Label>
            <Input
              id="edit-zakat"
              type="number"
              step="0.01"
              min="0"
              value={zakat}
              onChange={(e) => setZakat(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-lillah" className="text-muted-foreground font-normal">Lillah</Label>
            <Input
              id="edit-lillah"
              type="number"
              step="0.01"
              min="0"
              value={lillah}
              onChange={(e) => setLillah(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-card" className="text-muted-foreground font-normal">Card</Label>
            <Input
              id="edit-card"
              type="number"
              step="0.01"
              min="0"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground font-normal">Total</Label>
            <Input
              value={`£${totalDisplay}`}
              readOnly
              className="bg-muted font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-date" className="text-sm font-medium text-foreground">Collected at</Label>
          <Input
            id="edit-date"
            type="datetime-local"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes" className="text-sm font-medium text-foreground">Notes (optional)</Label>
        <Textarea
          id="edit-notes"
          transform="titleCase"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  )
}
