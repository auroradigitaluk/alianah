"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconTag, IconCash, IconBuildingBank } from "@tabler/icons-react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Target, Calendar, FileText, StickyNote, User, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

function toDatetimeLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const h = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day}T${h}:${min}`
}

const DONATION_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "SADAQAH", label: "Sadaqah" },
  { value: "ZAKAT", label: "Zakat" },
  { value: "LILLAH", label: "Lillah" },
]

const PAYMENT_SOURCES = [
  { value: "CASH", label: "Cash" },
  { value: "CARD_SUMUP", label: "Card (SumUp)" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OFFICE_BUCKETS", label: "Office buckets" },
]

interface OfflineIncome {
  id: string
  amountPence: number
  donationType: string
  source: string
  receivedAt: Date
  appeal?: { title: string } | null
  appealId?: string | null
  notes?: string | null
  addedByName?: string | null
  itemType?: "appeal" | "water" | "sponsorship"
}

type AppealOption = { id: string; title: string }

export function OfflineIncomeTable({
  income,
  showLoggedBy = true,
  canEdit = false,
  appeals = [],
}: {
  income: OfflineIncome[]
  showLoggedBy?: boolean
  canEdit?: boolean
  appeals?: AppealOption[]
}) {
  const router = useRouter()
  const [selectedIncome, setSelectedIncome] = useState<OfflineIncome | null>(null)
  const [editingIncome, setEditingIncome] = useState<OfflineIncome | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<OfflineIncome | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [appealQuery, setAppealQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const sourceOptions = useMemo(
    () => Array.from(new Set(income.map((item) => item.source))).sort(),
    [income]
  )

  const filteredIncome = useMemo(() => {
    const normalizedAppeal = appealQuery.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    if (from) from.setHours(0, 0, 0, 0)
    if (to) to.setHours(23, 59, 59, 999)

    return income.filter((item) => {
      const appealName = (item.appeal?.title || "General").toLowerCase()
      const matchesAppeal = normalizedAppeal
        ? appealName.includes(normalizedAppeal)
        : true
      const matchesSource = sourceFilter === "all" || item.source === sourceFilter
      const dateValue = item.receivedAt ? new Date(item.receivedAt) : null
      const matchesDate =
        (!from || (dateValue && dateValue >= from)) &&
        (!to || (dateValue && dateValue <= to))

      return matchesAppeal && matchesSource && matchesDate
    })
  }, [appealQuery, fromDate, income, sourceFilter, toDate])

  const clearFilters = () => {
    setAppealQuery("")
    setSourceFilter("all")
    setFromDate("")
    setToDate("")
  }

  const getItemType = (item: OfflineIncome): "appeal" | "water" | "sponsorship" => {
    if (item.itemType) return item.itemType
    if (item.id.startsWith("water-")) return "water"
    if (item.id.startsWith("sponsorship-")) return "sponsorship"
    return "appeal"
  }

  const handleSaveEdit = async (data: {
    amountPence: number
    appealId?: string | null
    donationType: string
    source: string
    receivedAt: string
    notes: string | null
  }) => {
    if (!editingIncome) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/offline-income/${editingIncome.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence: data.amountPence,
          ...(getItemType(editingIncome) === "appeal" && { appealId: data.appealId || null }),
          donationType: data.donationType,
          source: data.source,
          receivedAt: data.receivedAt,
          notes: data.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update")
      }
      toast.success("Updated")
      setEditingIncome(null)
      setSelectedIncome(null)
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
      const res = await fetch(`/api/admin/offline-income/${deleteConfirm.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Deleted")
      setDeleteConfirm(null)
      setSelectedIncome(null)
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="offline-appeal">Appeal</Label>
            <Input
              id="offline-appeal"
              transform="titleCase"
              placeholder="Search appeal"
              value={appealQuery}
              onChange={(event) => setAppealQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>
                    {formatEnum(source)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-from">From</Label>
            <Input
              id="offline-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offline-to">To</Label>
            <Input
              id="offline-to"
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
        data={filteredIncome}
        onRowClick={(item) => setSelectedIncome(item)}
        columns={[
        {
          id: "appeal",
          header: "Appeal Name",
          cell: (item) => (
            <div className="font-medium">
              {item.appeal?.title || "General"}
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
          id: "source",
          header: "Source",
          cell: (item) => {
            const sourceStyles: Record<string, string> = {
              CASH: "bg-primary text-primary-foreground border-primary",
              CARD_SUMUP: "bg-orange-500 text-white border-orange-500",
              BANK_TRANSFER: "bg-blue-500 text-white border-blue-500",
              OFFICE_BUCKETS: "bg-purple-500 text-white border-purple-500",
            }
            const Icon =
              item.source === "CASH"
                ? IconCash
                : item.source === "CARD_SUMUP"
                ? IconTag
                : item.source === "OFFICE_BUCKETS"
                ? IconCash
                : IconBuildingBank
            return (
              <Badge
                variant="outline"
                className={`px-1.5 ${sourceStyles[item.source] || ""}`}
              >
                <Icon className="mr-1 size-3" />
                {formatEnum(item.source)}
              </Badge>
            )
          },
        },
        {
          id: "date",
          header: "Date",
          cell: (item) => (
            <div className="text-sm">
              {formatDate(item.receivedAt)}
            </div>
          ),
        },
        ...(showLoggedBy
          ? [
              {
                id: "loggedBy" as const,
                header: "Logged by",
                cell: (item: OfflineIncome) => (
                  <div className="text-sm text-muted-foreground">
                    {item.addedByName || "—"}
                  </div>
                ),
              },
            ]
          : []),
      ]}
      enableSelection={false}
      />
      <Dialog
        open={!!selectedIncome}
        onOpenChange={(open) => !open && setSelectedIncome(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Offline Income Details
                </DialogTitle>
                <DialogDescription>
                  {selectedIncome && `${formatCurrency(selectedIncome.amountPence)} from ${formatEnum(selectedIncome.source)}`}
                </DialogDescription>
              </div>
              {canEdit && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingIncome(selectedIncome)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(selectedIncome)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedIncome && (
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
                            {formatCurrency(selectedIncome.amountPence)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Source
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <Badge 
                            variant={selectedIncome.source === "CASH" ? "default" : "outline"} 
                            className={`px-1.5 ${
                              selectedIncome.source === "CASH" 
                                ? "" 
                                : "bg-blue-500 text-white border-blue-500"
                            }`}
                          >
                            {selectedIncome.source === "CASH" ? (
                              <IconCash className="mr-1 size-3" />
                            ) : (
                              <IconBuildingBank className="mr-1 size-3" />
                            )}
                            {formatEnum(selectedIncome.source)}
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />

                    {/* Income Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Income Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Appeal
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedIncome.appeal?.title || "General"}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Donation Type
                              </p>
                              <Badge variant="outline" className="text-muted-foreground px-1.5">
                                <IconTag className="mr-1 size-3" />
                                {formatEnum(selectedIncome.donationType)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Date Received
                              </p>
                              <p className="text-base text-foreground">{formatDateTime(selectedIncome.receivedAt)}</p>
                            </div>
                          </div>
                          {showLoggedBy && selectedIncome.addedByName && (
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Logged by
                              </p>
                              <p className="text-base text-foreground">{selectedIncome.addedByName}</p>
                            </div>
                          </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedIncome.notes && (
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
                            <p className="text-base text-foreground">{selectedIncome.notes}</p>
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
      <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit offline income</DialogTitle>
            <DialogDescription>
              Update the details below. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          {editingIncome && (
            <OfflineIncomeEditForm
              item={editingIncome}
              appeals={appeals}
              onSave={handleSaveEdit}
              onCancel={() => setEditingIncome(null)}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete offline income?</DialogTitle>
            <DialogDescription>
              This will permanently remove this entry. This action cannot be undone.
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

function OfflineIncomeEditForm({
  item,
  appeals,
  onSave,
  onCancel,
  saving,
}: {
  item: OfflineIncome
  appeals: AppealOption[]
  onSave: (data: {
    amountPence: number
    appealId?: string | null
    donationType: string
    source: string
    receivedAt: string
    notes: string | null
  }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [amountPence, setAmountPence] = useState(String((item.amountPence / 100).toFixed(2)))
  const isAppealType = item.itemType === "appeal" || (!item.itemType && !item.id.startsWith("water-") && !item.id.startsWith("sponsorship-"))
  const [appealId, setAppealId] = useState(item.appealId ?? "")
  const [donationType, setDonationType] = useState(item.donationType)
  const [source, setSource] = useState(item.source)
  const initialReceivedAt = toDatetimeLocal(new Date(item.receivedAt))
  const [receivedAt, setReceivedAt] = useState(initialReceivedAt)
  const [notes, setNotes] = useState(item.notes ?? "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Math.round(parseFloat(amountPence) * 100)
    if (isNaN(amount) || amount <= 0) {
      return
    }
    const receivedAtToSave =
      receivedAt === initialReceivedAt ? new Date().toISOString() : new Date(receivedAt).toISOString()
    onSave({
      amountPence: amount,
      ...(isAppealType && { appealId: appealId || null }),
      donationType,
      source,
      receivedAt: receivedAtToSave,
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-amount">Amount (£)</Label>
        <Input
          id="edit-amount"
          type="number"
          step="0.01"
          min="0"
          value={amountPence}
          onChange={(e) => setAmountPence(e.target.value)}
          required
        />
      </div>
      {isAppealType && (
        <div className="space-y-2">
          <Label htmlFor="edit-appeal">Appeal</Label>
          <Select
            value={appealId || "__none__"}
            onValueChange={(v) => setAppealId(v === "__none__" ? "" : v)}
          >
            <SelectTrigger id="edit-appeal">
              <SelectValue placeholder="Select appeal" />
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
      )}
      <div className="space-y-2">
        <Label htmlFor="edit-type">Donation type</Label>
        <Select value={donationType} onValueChange={setDonationType}>
          <SelectTrigger id="edit-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DONATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-source">Source</Label>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger id="edit-source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-date">Date & time</Label>
        <Input
          id="edit-date"
          type="datetime-local"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-notes">Notes</Label>
        <Textarea
          id="edit-notes"
          transform="titleCase"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
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
