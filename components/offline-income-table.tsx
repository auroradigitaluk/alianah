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
import { Wallet, Target, Calendar, FileText, StickyNote, User, Pencil, Trash2, Gift, Mail } from "lucide-react"
import { toast } from "sonner"
import { CHECKOUT_COUNTRIES } from "@/lib/countries"
import { toTitleCaseLive } from "@/lib/utils"

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

const FUNDRAISER_PAYMENT_SOURCES = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
]

interface OfflineIncomeDonor {
  title?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
}

interface OfflineIncome {
  id: string
  amountPence: number
  donationType: string
  source: string
  receivedAt: Date
  orderNumber?: string | null
  appeal?: { title: string } | null
  appealId?: string | null
  notes?: string | null
  addedByName?: string | null
  itemType?: "appeal" | "water" | "sponsorship" | "fundraiser_cash"
  donorName?: string | null
  donorEmail?: string | null
  donorPhone?: string | null
  giftAid?: boolean
  donor?: OfflineIncomeDonor
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
    () =>
      Array.from(new Set(income.map((item) => item.source).filter(Boolean)))
        .filter((s): s is string => s != null && s !== "")
        .sort(),
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

  const getItemType = (item: OfflineIncome | null | undefined): "appeal" | "water" | "sponsorship" | "fundraiser_cash" => {
    if (!item) return "appeal"
    if (item.itemType) return item.itemType
    if (item.id.startsWith("water-")) return "water"
    if (item.id.startsWith("sponsorship-")) return "sponsorship"
    if (item.id.startsWith("fundraiser_cash-")) return "fundraiser_cash"
    return "appeal"
  }

  const handleSaveEdit = async (data: {
    amountPence: number
    appealId?: string | null
    donationType: string
    source: string
    receivedAt: string
    notes: string | null
    giftAid?: boolean
    sendReceiptEmail?: boolean
    donor?: OfflineIncomeDonor
  }) => {
    if (!editingIncome) return
    setSaving(true)
    try {
      const isAppeal = getItemType(editingIncome) === "appeal"
      const res = await fetch(`/api/admin/offline-income/${editingIncome.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence: data.amountPence,
          ...(isAppeal && { appealId: data.appealId || null }),
          donationType: data.donationType,
          source: data.source,
          receivedAt: data.receivedAt,
          notes: data.notes || null,
          ...(isAppeal && data.giftAid !== undefined && { giftAid: data.giftAid }),
          ...(isAppeal && data.sendReceiptEmail !== undefined && { sendReceiptEmail: data.sendReceiptEmail }),
          ...(isAppeal && data.donor && { donor: data.donor }),
        }),
      })
      if (!res.ok) {
        let errBody: { error?: string; message?: string } = {}
        try {
          errBody = await res.json()
        } catch {
          // non-JSON response (e.g. HTML error page)
        }
        const message = errBody.error ?? errBody.message ?? `Failed to update (${res.status})`
        throw new Error(message)
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

  const handleSaveFundraiserCash = async (data: {
    amountPence: number
    donationType: string
    paymentMethod: string
    receivedAt: string
    donorName: string | null
    donorEmail: string | null
    donorPhone: string | null
    notes: string | null
  }) => {
    if (!editingIncome || getItemType(editingIncome) !== "fundraiser_cash") return
    const realId = editingIncome.id.replace(/^fundraiser_cash-/, "")
    if (!realId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/fundraisers/cash-donations/${realId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPence: data.amountPence,
          donationType: data.donationType,
          paymentMethod: data.paymentMethod,
          receivedAt: data.receivedAt,
          donorName: data.donorName || null,
          donorEmail: data.donorEmail && data.donorEmail.trim() ? data.donorEmail.trim() : null,
          donorPhone: data.donorPhone || null,
          notes: data.notes || null,
        }),
      })
      if (!res.ok) {
        let errBody: { error?: string; message?: string } = {}
        try {
          errBody = await res.json()
        } catch {
          // non-JSON response
        }
        const message = errBody.error ?? errBody.message ?? `Failed to update (${res.status})`
        throw new Error(message)
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
          id: "orderNumber",
          header: "Order No.",
          cell: (item) => (
            <div className="text-xs font-mono">
              {item.orderNumber || <span className="text-muted-foreground">—</span>}
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
              {canEdit && selectedIncome && (
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
                          {selectedIncome.orderNumber && (
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Order Number
                                </p>
                                <p className="text-base font-mono font-semibold text-foreground">{selectedIncome.orderNumber}</p>
                              </div>
                            </div>
                          )}
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

      {/* Edit dialog - matches Add offline modal layout */}
      <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
        <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit offline income</DialogTitle>
            <DialogDescription>
              {editingIncome &&
                `${formatCurrency(editingIncome.amountPence)} from ${formatEnum(editingIncome.source)}`}
            </DialogDescription>
          </DialogHeader>
          {editingIncome && (
            <OfflineIncomeEditForm
              item={editingIncome}
              appeals={appeals}
              onSave={(data) => {
                if (getItemType(editingIncome) === "fundraiser_cash") {
                  handleSaveFundraiserCash({
                    amountPence: data.amountPence,
                    donationType: data.donationType,
                    paymentMethod: data.source,
                    receivedAt: data.receivedAt,
                    donorName: data.donorName ?? null,
                    donorEmail: data.donorEmail ?? null,
                    donorPhone: data.donorPhone ?? null,
                    notes: data.notes ?? null,
                  })
                } else {
                  handleSaveEdit(data)
                }
              }}
              onCancel={() => setEditingIncome(null)}
              saving={saving}
            />
          )}
          {editingIncome && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingIncome(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="offline-income-edit-form"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Entry"}
              </Button>
            </div>
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
    giftAid?: boolean
    sendReceiptEmail?: boolean
    donor?: OfflineIncomeDonor
    donorName?: string | null
    donorEmail?: string | null
    donorPhone?: string | null
  }) => void
  onCancel: () => void
  saving: boolean
}) {
  const isFundraiserCash = item.itemType === "fundraiser_cash"
  const isAppealType = !isFundraiserCash && (item.itemType === "appeal" || (!item.itemType && !item.id.startsWith("water-") && !item.id.startsWith("sponsorship-")))

  const [amountPence, setAmountPence] = useState(String((item.amountPence / 100).toFixed(2)))
  const [appealId, setAppealId] = useState(item.appealId ?? "")
  const [donationType, setDonationType] = useState(item.donationType)
  const [source, setSource] = useState(item.source)
  const [receivedAt, setReceivedAt] = useState(toDatetimeLocal(new Date(item.receivedAt)))
  const [notes, setNotes] = useState(item.notes ?? "")

  const d = item.donor
  const hasExistingDonor = !isFundraiserCash && (item.giftAid || (d && (d.firstName || d.lastName || d.email || d.phone || d.address || d.city || d.postcode || d.country)))
  const hasFundraiserDonor = isFundraiserCash && (item.donorName?.trim() || item.donorEmail?.trim() || item.donorPhone?.trim())
  const [giftAidExpanded, setGiftAidExpanded] = useState(!!(hasExistingDonor || hasFundraiserDonor))
  const [sendReceiptEmail, setSendReceiptEmail] = useState(false)
  const [giftaidTitle, setGiftaidTitle] = useState(d?.title ?? "")
  const [firstName, setFirstName] = useState(isFundraiserCash ? (item.donorName ?? "") : (d?.firstName ?? ""))
  const [lastName, setLastName] = useState(isFundraiserCash ? "" : (d?.lastName ?? ""))
  const [email, setEmail] = useState((isFundraiserCash ? item.donorEmail : d?.email) ?? "")
  const [giftaidPhone, setGiftaidPhone] = useState((isFundraiserCash ? item.donorPhone : d?.phone) ?? "")
  const [giftaidAddress, setGiftaidAddress] = useState(d?.address ?? "")
  const [giftaidCity, setGiftaidCity] = useState(d?.city ?? "")
  const [giftaidPostcode, setGiftaidPostcode] = useState(d?.postcode ?? "")
  const [giftaidCountry, setGiftaidCountry] = useState(d?.country ?? "GB")
  const [receiptEmail, setReceiptEmail] = useState((isFundraiserCash ? item.donorEmail : d?.email) ?? "")
  const [receiptFirstName, setReceiptFirstName] = useState((isFundraiserCash ? item.donorName : d?.firstName) ?? "")
  const [receiptLastName, setReceiptLastName] = useState(d?.lastName ?? "")

  const countryOptions = useMemo(() => {
    const display = new Intl.DisplayNames(["en"], { type: "region" })
    return CHECKOUT_COUNTRIES
      .map((code) => ({ code, label: display.of(code) || code }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Math.round(parseFloat(amountPence) * 100)
    if (isNaN(amount) || amount <= 0) return
    const hasGiftAidDetails =
      giftAidExpanded &&
      (firstName.trim() ||
        lastName.trim() ||
        email.trim() ||
        giftaidPhone.trim() ||
        giftaidAddress.trim() ||
        giftaidCity.trim() ||
        giftaidPostcode.trim() ||
        giftaidCountry.trim())
    const donorPayload: OfflineIncomeDonor | undefined =
      (isAppealType || isFundraiserCash) && (hasGiftAidDetails || (sendReceiptEmail && receiptEmail.trim() && receiptFirstName.trim() && receiptLastName.trim()))
        ? hasGiftAidDetails
          ? {
              title: giftaidTitle.trim() || undefined,
              firstName: firstName.trim() ? toTitleCaseLive(firstName.trim()) : undefined,
              lastName: lastName.trim() ? toTitleCaseLive(lastName.trim()) : undefined,
              email: email.trim() || undefined,
              phone: giftaidPhone.trim() || undefined,
              address: giftaidAddress.trim() || undefined,
              city: giftaidCity.trim() || undefined,
              postcode: giftaidPostcode.trim() || undefined,
              country: giftaidCountry.trim() || undefined,
            }
          : {
              firstName: receiptFirstName.trim() ? toTitleCaseLive(receiptFirstName.trim()) : undefined,
              lastName: receiptLastName.trim() ? toTitleCaseLive(receiptLastName.trim()) : undefined,
              email: receiptEmail.trim() || undefined,
            }
        : undefined
    const donorNameStr = isFundraiserCash
      ? (giftAidExpanded ? [firstName, lastName] : [receiptFirstName, receiptLastName]).map((s) => s.trim()).filter(Boolean).join(" ").trim() || null
      : null
    const donorEmailStr = isFundraiserCash ? (giftAidExpanded ? email.trim() : receiptEmail.trim()) || null : null
    onSave({
      amountPence: amount,
      ...(isAppealType && { appealId: appealId || null }),
      donationType,
      source,
      receivedAt: new Date(receivedAt).toISOString(),
      notes: notes.trim() || null,
      ...(isAppealType && {
        giftAid: giftAidExpanded,
        sendReceiptEmail,
        ...(donorPayload && { donor: donorPayload }),
      }),
      ...(isFundraiserCash && {
        donorName: donorNameStr,
        donorEmail: donorEmailStr,
        donorPhone: giftaidPhone.trim() || null,
      }),
    })
  }

  return (
    <form id="offline-income-edit-form" onSubmit={handleSubmit} className="space-y-5">
      {isFundraiserCash && item.appeal?.title && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Campaign</Label>
          <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {item.appeal.title}
          </div>
        </div>
      )}
      {isAppealType && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Appeal</Label>
          <Select value={appealId || "__none__"} onValueChange={(v) => setAppealId(v === "__none__" ? "" : v)}>
            <SelectTrigger className="w-full">
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-amount">Amount (£)</Label>
          <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs overflow-hidden">
            <span className="pl-3 text-muted-foreground text-sm">£</span>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0"
              value={amountPence}
              onChange={(e) => setAmountPence(e.target.value)}
              placeholder="0.00"
              className="border-0 shadow-none min-w-0 flex-1 rounded-none py-1 pr-3 pl-1 h-9 focus-visible:ring-0 focus-visible:ring-offset-0"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-date">Received Date & time</Label>
          <Input
            id="edit-date"
            type="datetime-local"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Donation Type</Label>
          <Select value={donationType} onValueChange={setDonationType}>
            <SelectTrigger className="w-full">
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
          <Label className="text-sm font-medium text-foreground">Payment Method</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(isFundraiserCash ? FUNDRAISER_PAYMENT_SOURCES : PAYMENT_SOURCES).map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {(isAppealType || isFundraiserCash) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={giftAidExpanded ? "secondary" : "outline"}
              size="sm"
              onClick={() => setGiftAidExpanded((v) => !v)}
              className="gap-2"
            >
              <Gift className="h-4 w-4" />
              {giftAidExpanded ? "Gift Aid (details added)" : "Add Gift Aid"}
            </Button>
            <Button
              type="button"
              variant={sendReceiptEmail ? "secondary" : "outline"}
              size="sm"
              onClick={() => setSendReceiptEmail((v) => !v)}
              className="gap-2 w-fit"
            >
              <Mail className="h-4 w-4" />
              {sendReceiptEmail ? "Send Email Receipt (on)" : "Send Email Receipt"}
            </Button>
          </div>
          {giftAidExpanded && (
            <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Donor details for Gift Aid (UK taxpayer). Optional
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-giftaid-title">Title</Label>
                  <Select value={giftaidTitle || "none"} onValueChange={(v) => setGiftaidTitle(v === "none" ? "" : v)}>
                    <SelectTrigger id="edit-giftaid-title">
                      <SelectValue placeholder="Title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Miss">Miss</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-giftaid-first">First Name *</Label>
                  <Input
                    id="edit-giftaid-first"
                    transform="titleCase"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-giftaid-last">Last Name *</Label>
                  <Input
                    id="edit-giftaid-last"
                    transform="titleCase"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-giftaid-email">Email *</Label>
                  <Input
                    id="edit-giftaid-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-giftaid-phone">Phone</Label>
                  <Input
                    id="edit-giftaid-phone"
                    value={giftaidPhone}
                    onChange={(e) => setGiftaidPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-giftaid-country">Country</Label>
                  <Select value={giftaidCountry} onValueChange={setGiftaidCountry}>
                    <SelectTrigger id="edit-giftaid-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map(({ code, label }) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-giftaid-address">Address</Label>
                  <Input
                    id="edit-giftaid-address"
                    transform="titleCase"
                    value={giftaidAddress}
                    onChange={(e) => setGiftaidAddress(e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-giftaid-city">City</Label>
                    <Input
                      id="edit-giftaid-city"
                      transform="titleCase"
                      value={giftaidCity}
                      onChange={(e) => setGiftaidCity(e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-giftaid-postcode">Postcode</Label>
                    <Input
                      id="edit-giftaid-postcode"
                      transform="uppercase"
                      value={giftaidPostcode}
                      onChange={(e) => setGiftaidPostcode(e.target.value)}
                      placeholder="Postcode"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {sendReceiptEmail && (
            <div className="space-y-4">
              {!giftAidExpanded && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-receipt-first">First name</Label>
                    <Input
                      id="edit-receipt-first"
                      transform="titleCase"
                      value={receiptFirstName}
                      onChange={(e) => setReceiptFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-receipt-last">Last name</Label>
                    <Input
                      id="edit-receipt-last"
                      transform="titleCase"
                      value={receiptLastName}
                      onChange={(e) => setReceiptLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-receipt-email">Email for Receipt</Label>
                <Input
                  id="edit-receipt-email"
                  type="email"
                  value={giftAidExpanded ? email : receiptEmail}
                  onChange={(e) =>
                    giftAidExpanded ? setEmail(e.target.value) : setReceiptEmail(e.target.value)
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="edit-notes">Notes (optional)</Label>
        <Textarea
          id="edit-notes"
          transform="titleCase"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </form>
  )
}

