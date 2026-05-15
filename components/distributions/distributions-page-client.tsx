"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatAdminUserName, formatDate, cn } from "@/lib/utils"
import {
  IconLoader2,
  IconPlus,
  IconWallet,
  IconReceipt,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { ExternalLink, FileText } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

type AvailableRow = {
  appealId: string
  appealTitle: string
  totalReceivedPence: number
  distributedPence: number
  availablePence: number
}

const ITEM_UNIT_EMPTY = "__none__"
const ITEM_UNIT_OPTIONS = [
  { value: ITEM_UNIT_EMPTY, label: "—" },
  { value: "pcs", label: "pcs" },
  { value: "litres", label: "litres" },
  { value: "boxes", label: "boxes" },
] as const

type DistributedItem = { label: string; amount: number; unit?: string }

function parseItemsDistributed(raw: string | null): DistributedItem[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is DistributedItem =>
        x != null &&
        typeof x === "object" &&
        typeof (x as DistributedItem).label === "string" &&
        typeof (x as DistributedItem).amount === "number"
    )
  } catch {
    return []
  }
}

function formatItemsDistributed(items: DistributedItem[]): string {
  return items
    .map((i) => (i.unit ? `${i.label} ${i.amount} ${i.unit}` : `${i.label} ${i.amount}`))
    .join(", ")
}

function parseAmountInput(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

function formatAmountInput(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ""
  return n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

async function uploadDistributionInvoice(file: File): Promise<{ url: string; fileName: string }> {
  const fd = new FormData()
  fd.set("file", file)
  const res = await fetch("/api/admin/distributions/upload-invoice", { method: "POST", body: fd })
  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string; fileName?: string }
  if (!res.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Failed to upload invoice")
  }
  if (!data.url) throw new Error("Upload did not return a file URL")
  return { url: data.url, fileName: typeof data.fileName === "string" ? data.fileName : file.name }
}

type DistributionRow = {
  id: string
  appealId: string
  appealTitle: string
  amountPence: number
  description: string
  country: string | null
  itemsDistributed: string | null
  invoiceUrl: string | null
  invoiceFileName: string | null
  createdAt: string
  createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null
}

export function DistributionsPageClient() {
  const [available, setAvailable] = React.useState<AvailableRow[]>([])
  const [distributions, setDistributions] = React.useState<DistributionRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState<"available" | "distributions">("available")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [formAppealId, setFormAppealId] = React.useState("")
  const [formAmount, setFormAmount] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")
  const [formCountry, setFormCountry] = React.useState("")
  const [formItems, setFormItems] = React.useState<
    Array<{ label: string; amount: string; unit: string }>
  >([{ label: "", amount: "", unit: ITEM_UNIT_EMPTY }])
  const [selectedDistribution, setSelectedDistribution] =
    React.useState<DistributionRow | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false)
  const [editingDistribution, setEditingDistribution] = React.useState(false)
  const [editAppealId, setEditAppealId] = React.useState("")
  const [editAmount, setEditAmount] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")
  const [editCountry, setEditCountry] = React.useState("")
  const [editItems, setEditItems] = React.useState<
    Array<{ label: string; amount: string; unit: string }>
  >([{ label: "", amount: "", unit: ITEM_UNIT_EMPTY }])
  const [savingEdit, setSavingEdit] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [formInvoiceFile, setFormInvoiceFile] = React.useState<File | null>(null)
  const [logModalKey, setLogModalKey] = React.useState(0)
  const [editInvoiceFile, setEditInvoiceFile] = React.useState<File | null>(null)
  const [editRemoveInvoice, setEditRemoveInvoice] = React.useState(false)

  const fetchAvailable = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/distributions/available")
      const data = await res.json()
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to load available funds")
      }
      setAvailable(data as AvailableRow[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load available funds")
    }
  }, [])

  const fetchDistributions = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/distributions")
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as DistributionRow[]
      setDistributions(data)
    } catch {
      toast.error("Failed to load distributions")
    }
  }, [])

  const load = React.useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchAvailable(), fetchDistributions()])
    setLoading(false)
  }, [fetchAvailable, fetchDistributions])

  React.useEffect(() => {
    load()
  }, [load])

  const selectedAvailable = formAppealId
    ? available.find((a) => a.appealId === formAppealId)
    : null
  const amountPence = formAmount ? Math.round(parseAmountInput(formAmount) * 100) : 0
  const remainingAfter =
    selectedAvailable && amountPence > 0
      ? Math.max(0, selectedAvailable.availablePence - amountPence)
      : selectedAvailable?.availablePence ?? 0

  const openLogModal = React.useCallback(() => {
    setFormAppealId("")
    setFormAmount("")
    setFormDescription("")
    setFormCountry("")
    setFormItems([{ label: "", amount: "", unit: ITEM_UNIT_EMPTY }])
    setFormInvoiceFile(null)
    setLogModalKey((k) => k + 1)
    setModalOpen(true)
  }, [])

  const handleLogDistribution = React.useCallback(async () => {
    if (!formAppealId || !formAmount.trim()) {
      toast.error("Please fill in appeal and amount")
      return
    }
    const pence = Math.round(parseAmountInput(formAmount) * 100)
    if (pence <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    const avail = available.find((a) => a.appealId === formAppealId)
    if (avail && pence > avail.availablePence) {
      toast.error(
        `Only ${formatCurrency(avail.availablePence)} available for this appeal. Reduce the amount or choose another appeal.`
      )
      return
    }
    setSubmitting(true)
    try {
      let invoiceUrl: string | null = null
      let invoiceFileName: string | null = null
      if (formInvoiceFile) {
        const uploaded = await uploadDistributionInvoice(formInvoiceFile)
        invoiceUrl = uploaded.url
        invoiceFileName = uploaded.fileName
      }
      const res = await fetch("/api/admin/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appealId: formAppealId,
          amountPence: pence,
          description: formDescription.trim() || "",
          country: formCountry.trim() || null,
          itemsDistributed: (() => {
            const items = formItems
              .filter((r) => r.label.trim() && r.amount.trim())
              .map((r) => ({
                label: r.label.trim(),
                amount: Number(r.amount.trim()),
                ...(r.unit && r.unit !== ITEM_UNIT_EMPTY ? { unit: r.unit } : {}),
              }))
              .filter((r) => Number.isFinite(r.amount))
            return items.length > 0 ? JSON.stringify(items) : null
          })(),
          invoiceUrl,
          invoiceFileName,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to log distribution")
      }
      toast.success("Distribution logged")
      setModalOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log distribution")
    } finally {
      setSubmitting(false)
    }
  }, [formAppealId, formAmount, formDescription, formCountry, formItems, formInvoiceFile, available, load])

  const openDetails = React.useCallback((d: DistributionRow) => {
    setSelectedDistribution(d)
    setEditingDistribution(false)
    setEditInvoiceFile(null)
    setEditRemoveInvoice(false)
    setEditAppealId(d.appealId)
    setEditAmount(formatAmountInput(d.amountPence / 100))
    setEditDescription(d.description)
    setEditCountry(d.country ?? "")
    const items = parseItemsDistributed(d.itemsDistributed)
    setEditItems(
      items.length > 0
        ? items.map((i) => ({
            label: i.label,
            amount: String(i.amount),
            unit: i.unit && i.unit !== ITEM_UNIT_EMPTY ? i.unit : ITEM_UNIT_EMPTY,
          }))
        : [{ label: "", amount: "", unit: ITEM_UNIT_EMPTY }]
    )
    setDetailsModalOpen(true)
  }, [])

  const closeDetails = React.useCallback(() => {
    setDetailsModalOpen(false)
    setSelectedDistribution(null)
    setEditingDistribution(false)
    setDeletingId(null)
    setEditInvoiceFile(null)
    setEditRemoveInvoice(false)
  }, [])

  const handleUpdateDistribution = React.useCallback(async () => {
    if (!selectedDistribution) return
    if (!editAppealId.trim() || !editAmount.trim()) {
      toast.error("Please fill in appeal and amount")
      return
    }
    const pence = Math.round(parseAmountInput(editAmount) * 100)
    if (pence <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    const avail = available.find((a) => a.appealId === editAppealId)
    if (avail) {
      const otherDistributedForThisAppeal = distributions
        .filter(
          (x) => x.appealId === editAppealId && x.id !== selectedDistribution.id
        )
        .reduce((sum, x) => sum + x.amountPence, 0)
      let availableForAppeal = avail.totalReceivedPence - otherDistributedForThisAppeal
      if (selectedDistribution.appealId === editAppealId) {
        availableForAppeal += selectedDistribution.amountPence
      }
      if (pence > availableForAppeal) {
        toast.error(
          `Only ${formatCurrency(availableForAppeal)} available for this appeal. Reduce the amount.`
        )
        return
      }
    }
    setSavingEdit(true)
    try {
      let invoiceUrl: string | null | undefined
      let invoiceFileName: string | null | undefined
      if (editRemoveInvoice) {
        invoiceUrl = null
        invoiceFileName = null
      } else if (editInvoiceFile) {
        const uploaded = await uploadDistributionInvoice(editInvoiceFile)
        invoiceUrl = uploaded.url
        invoiceFileName = uploaded.fileName
      }

      const patchBody: Record<string, unknown> = {
        appealId: editAppealId.trim(),
        amountPence: pence,
        description: editDescription.trim() || "",
        country: editCountry.trim() || null,
        itemsDistributed: (() => {
          const items = editItems
            .filter((r) => r.label.trim() && r.amount.trim())
            .map((r) => ({
              label: r.label.trim(),
              amount: Number(r.amount.trim()),
              ...(r.unit && r.unit !== ITEM_UNIT_EMPTY ? { unit: r.unit } : {}),
            }))
            .filter((r) => Number.isFinite(r.amount))
          return items.length > 0 ? JSON.stringify(items) : null
        })(),
      }
      if (invoiceUrl !== undefined) {
        patchBody.invoiceUrl = invoiceUrl
        patchBody.invoiceFileName = invoiceFileName ?? null
      }

      const res = await fetch(`/api/admin/distributions/${selectedDistribution.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success("Distribution updated")
      setEditingDistribution(false)
      setEditInvoiceFile(null)
      setEditRemoveInvoice(false)
      load()
      setSelectedDistribution(
        (prev) =>
          prev && {
            ...prev,
            appealId: data.appealId,
            appealTitle: data.appealTitle ?? prev.appealTitle,
            amountPence: data.amountPence,
            description: data.description,
            country: data.country ?? null,
            itemsDistributed: data.itemsDistributed ?? null,
            invoiceUrl: data.invoiceUrl ?? null,
            invoiceFileName: data.invoiceFileName ?? null,
          }
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update distribution")
    } finally {
      setSavingEdit(false)
    }
  }, [
    selectedDistribution,
    editAppealId,
    editAmount,
    editDescription,
    editCountry,
    editItems,
    editInvoiceFile,
    editRemoveInvoice,
    available,
    distributions,
    load,
  ])

  const handleDeleteDistribution = React.useCallback(async () => {
    if (!selectedDistribution) return
    if (!confirm("Delete this distribution? This cannot be undone.")) return
    setDeletingId(selectedDistribution.id)
    try {
      const res = await fetch(`/api/admin/distributions/${selectedDistribution.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to delete")
      }
      toast.success("Distribution deleted")
      closeDetails()
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete distribution")
    } finally {
      setDeletingId(null)
    }
  }, [selectedDistribution, closeDetails, load])

  if (loading && available.length === 0 && distributions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Distributions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          See how much is available to spend per appeal (donations received minus distributions). Log
          distributions when you spend funds (e.g. convoy to Gaza, water tank in Gaza).
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "available" | "distributions")}>
        <TabsList className="w-fit">
          <TabsTrigger value="available" className="gap-1.5">
            <IconWallet className="size-4" />
            Available to spend
          </TabsTrigger>
          <TabsTrigger value="distributions" className="gap-1.5">
            <IconReceipt className="size-4" />
            Distributions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4">
          <Card className="py-0">
            <CardContent className="p-0">
              {available.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No appeals with donation data yet. Donations, offline income and collections
                  contribute to available funds per appeal.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Appeal</TableHead>
                      <TableHead className="text-right">Total received</TableHead>
                      <TableHead className="text-right">Distributed</TableHead>
                      <TableHead className="text-right font-semibold">Available to spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {available.map((row) => (
                      <TableRow key={row.appealId}>
                        <TableCell className="font-medium">{row.appealTitle}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.totalReceivedPence)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.distributedPence)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            row.availablePence > 0 ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          {formatCurrency(row.availablePence)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className="mt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Log when you spend funds (e.g. £60,000 Egypt to Gaza convoy, £500 water tank in Gaza).
            </p>
            <Button onClick={openLogModal}>
              <IconPlus className="size-4 mr-2" />
              Log distribution
            </Button>
          </div>
          <Card className="mt-6 py-0">
            <CardContent className="p-0">
              {distributions.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No distributions logged yet. Click &quot;Log distribution&quot; to record spending.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Appeal</TableHead>
                      <TableHead className="text-right">Amount spent</TableHead>
                      <TableHead>What was distributed</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Logged by</TableHead>
                      <TableHead className="w-[100px] text-center">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributions.map((d) => (
                      <TableRow
                        key={d.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetails(d)}
                      >
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(d.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{d.appealTitle}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(d.amountPence)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {formatItemsDistributed(parseItemsDistributed(d.itemsDistributed)) || "—"}
                        </TableCell>
                        <TableCell>{d.country ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {d.createdBy
                            ? formatAdminUserName(d.createdBy) || d.createdBy.email
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {d.invoiceUrl ? (
                            <a
                              href={d.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <FileText className="size-4 shrink-0" />
                              <ExternalLink className="size-3.5 shrink-0" />
                              <span className="sr-only">View invoice</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg sm:rounded-lg">
          <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 pb-4 pt-6 pr-12 text-center sm:text-left">
            <DialogTitle>Log distribution</DialogTitle>
            <DialogDescription>
              Record money spent from an appeal (e.g. convoy to Gaza, water tank). This reduces the
              available to spend for that appeal.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Appeal</Label>
              <Select value={formAppealId} onValueChange={setFormAppealId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select appeal" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((a) => (
                      <SelectItem key={a.appealId} value={a.appealId}>
                        {a.appealTitle} — {formatCurrency(a.availablePence)} available
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedAvailable && (
                <p className="text-xs text-muted-foreground">
                  Available for this appeal: {formatCurrency(selectedAvailable.availablePence)}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-amount">Amount spent</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:outline-none">
                <span className="pl-3 text-muted-foreground">£</span>
                <Input
                  id="dist-amount"
                  type="text"
                  inputMode="decimal"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  onBlur={() => {
                    const n = parseAmountInput(formAmount)
                    if (n > 0) setFormAmount(formatAmountInput(n))
                  }}
                  className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-1 pr-3"
                />
              </div>
              {selectedAvailable && formAmount && amountPence > 0 && (
                <p className="text-xs text-muted-foreground">
                  Remaining after this: {formatCurrency(remainingAfter)}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-description">Description (optional)</Label>
              <Textarea
                id="dist-description"
                placeholder="e.g. Egypt to Gaza convoy, Water tank in Gaza"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>What was distributed (optional)</Label>
              <p className="text-xs text-muted-foreground">
                e.g. food packs / 300, hot meals / 500. Add multiple rows if needed.
              </p>
              <div className="space-y-2">
                {formItems.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <Input
                      placeholder="e.g. food packs"
                      value={row.label}
                      onChange={(e) => {
                        const next = [...formItems]
                        next[idx] = { ...next[idx], label: e.target.value }
                        setFormItems(next)
                      }}
                      className="flex-1 max-w-[80%]"
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={row.amount}
                      onChange={(e) => {
                        const next = [...formItems]
                        next[idx] = { ...next[idx], amount: e.target.value }
                        setFormItems(next)
                      }}
                      className="w-20"
                    />
                    <Select
                      value={row.unit || ITEM_UNIT_EMPTY}
                      onValueChange={(v) => {
                        const next = [...formItems]
                        next[idx] = { ...next[idx], unit: v }
                        setFormItems(next)
                      }}
                    >
                      <SelectTrigger className="w-[72px] h-9 shrink-0">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_UNIT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() =>
                          setFormItems(formItems.filter((_, i) => i !== idx))
                        }
                        aria-label="Remove row"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                  setFormItems([...formItems, { label: "", amount: "", unit: ITEM_UNIT_EMPTY }])
                }
                >
                  Add another
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-invoice">Invoice (optional)</Label>
              <p className="text-xs text-muted-foreground">
                PDF or image (JPEG, PNG, WebP, GIF), up to 10MB. Open it anytime from the list or
                details.
              </p>
              <Input
                key={logModalKey}
                id="dist-invoice"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFormInvoiceFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
              {formInvoiceFile && (
                <p className="text-xs text-muted-foreground">Selected: {formInvoiceFile.name}</p>
              )}
            </div>
            </div>
          </div>
          <div className="shrink-0 border-t bg-background px-6 py-4">
            <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleLogDistribution} disabled={submitting}>
              {submitting && <IconLoader2 className="size-4 animate-spin mr-2" />}
              Log distribution
            </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsModalOpen} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg sm:rounded-lg">
          <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 pb-4 pt-6 pr-12 text-center sm:text-left">
            <DialogTitle>
              {editingDistribution ? "Edit distribution" : "Distribution details"}
            </DialogTitle>
            <DialogDescription>
              {editingDistribution
                ? "Update the distribution and save."
                : "View details or edit/delete this distribution."}
            </DialogDescription>
          </DialogHeader>
          {selectedDistribution && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
              {editingDistribution ? (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Appeal</Label>
                    <Select value={editAppealId} onValueChange={setEditAppealId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select appeal" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const appealIds = new Set(available.map((a) => a.appealId))
                          const options = [...available]
                          if (
                            selectedDistribution &&
                            !appealIds.has(selectedDistribution.appealId)
                          ) {
                            options.push({
                              appealId: selectedDistribution.appealId,
                              appealTitle: selectedDistribution.appealTitle,
                              totalReceivedPence: 0,
                              distributedPence: selectedDistribution.amountPence,
                              availablePence: 0,
                            })
                          }
                          return options.map((a) => (
                            <SelectItem key={a.appealId} value={a.appealId}>
                              {a.appealTitle} — {formatCurrency(a.availablePence)} available
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-amount">Amount spent</Label>
                    <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:outline-none">
                      <span className="pl-3 text-muted-foreground">£</span>
                      <Input
                        id="edit-amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 1,000 or 500"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onBlur={() => {
                          const n = parseAmountInput(editAmount)
                          if (n > 0) setEditAmount(formatAmountInput(n))
                        }}
                        className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 pl-1 pr-3"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-description">Description (optional)</Label>
                    <Textarea
                      id="edit-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>What was distributed (optional)</Label>
                    <div className="space-y-2">
                      {editItems.map((row, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <Input
                            placeholder="e.g. food packs"
                            value={row.label}
                            onChange={(e) => {
                              const next = [...editItems]
                              next[idx] = { ...next[idx], label: e.target.value }
                              setEditItems(next)
                            }}
                            className="flex-1 max-w-[80%]"
                          />
                          <Input
                            type="number"
                            min={0}
                            placeholder="Amount"
                            value={row.amount}
                            onChange={(e) => {
                              const next = [...editItems]
                              next[idx] = { ...next[idx], amount: e.target.value }
                              setEditItems(next)
                            }}
                            className="w-20"
                          />
                          <Select
                            value={row.unit || ITEM_UNIT_EMPTY}
                            onValueChange={(v) => {
                              const next = [...editItems]
                              next[idx] = { ...next[idx], unit: v }
                              setEditItems(next)
                            }}
                          >
                            <SelectTrigger className="w-[72px] h-9 shrink-0">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {ITEM_UNIT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {editItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0"
                              onClick={() =>
                                setEditItems(editItems.filter((_, i) => i !== idx))
                              }
                              aria-label="Remove row"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditItems([
                          ...editItems,
                          { label: "", amount: "", unit: ITEM_UNIT_EMPTY },
                        ])
                        }
                      >
                        Add another
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-country">Country / location (optional)</Label>
                    <Input
                      id="edit-country"
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Invoice</Label>
                    {selectedDistribution.invoiceUrl && !editRemoveInvoice && !editInvoiceFile ? (
                      <p className="text-xs text-muted-foreground">
                        Current file:{" "}
                        <a
                          href={selectedDistribution.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline inline-flex items-center gap-1"
                        >
                          {selectedDistribution.invoiceFileName || "View invoice"}
                          <ExternalLink className="size-3" />
                        </a>
                      </p>
                    ) : null}
                    {selectedDistribution.invoiceUrl ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="edit-remove-invoice"
                          checked={editRemoveInvoice}
                          onCheckedChange={(checked) => {
                            const on = checked === true
                            setEditRemoveInvoice(on)
                            if (on) setEditInvoiceFile(null)
                          }}
                        />
                        <label htmlFor="edit-remove-invoice" className="text-sm cursor-pointer">
                          Remove invoice
                        </label>
                      </div>
                    ) : null}
                    {!editRemoveInvoice && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {selectedDistribution.invoiceUrl
                            ? "Upload a new PDF or image to replace the current invoice."
                            : "Add an invoice (optional): PDF or image, up to 10MB."}
                        </p>
                        <Input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            setEditInvoiceFile(e.target.files?.[0] ?? null)
                            setEditRemoveInvoice(false)
                          }}
                          className="cursor-pointer"
                        />
                        {editInvoiceFile && (
                          <p className="text-xs text-muted-foreground">
                            New file: {editInvoiceFile.name}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Date</span>
                    <span>{formatDate(selectedDistribution.createdAt)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Appeal</span>
                    <span className="font-medium">{selectedDistribution.appealTitle}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Amount spent</span>
                    <span className="font-medium">
                      {formatCurrency(selectedDistribution.amountPence)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-right">{selectedDistribution.description}</span>
                  </div>
                  {(() => {
                    const items = parseItemsDistributed(selectedDistribution.itemsDistributed)
                    return items.length > 0 ? (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">What was distributed</span>
                        <span className="text-right max-w-[240px]">
                          {items.map((i, idx) => (
                            <span key={idx}>
                              {i.label}: {i.amount}
                              {i.unit ? ` ${i.unit}` : ""}
                              {idx < items.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </span>
                      </div>
                    ) : null
                  })()}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Country</span>
                    <span>{selectedDistribution.country ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4 items-start">
                    <span className="text-muted-foreground shrink-0">Invoice</span>
                    <span className="text-right min-w-0">
                      {selectedDistribution.invoiceUrl ? (
                        <a
                          href={selectedDistribution.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-end gap-1.5 font-medium text-primary hover:underline break-all"
                        >
                          <FileText className="size-4 shrink-0" />
                          <span className="min-w-0">
                            {selectedDistribution.invoiceFileName || "View invoice"}
                          </span>
                          <ExternalLink className="size-3.5 shrink-0" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Logged by</span>
                    <span>
                      {selectedDistribution.createdBy
                        ? formatAdminUserName(selectedDistribution.createdBy) ||
                          selectedDistribution.createdBy.email
                        : "—"}
                    </span>
                  </div>
                </div>
              )}
              </div>
              <div className="shrink-0 border-t bg-background px-6 py-4">
                <DialogFooter className="gap-2 sm:justify-end">
                {editingDistribution ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingDistribution(false)
                        setEditInvoiceFile(null)
                        setEditRemoveInvoice(false)
                      }}
                      disabled={savingEdit}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateDistribution} disabled={savingEdit}>
                      {savingEdit && <IconLoader2 className="size-4 animate-spin mr-2" />}
                      Save changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingDistribution(true)
                        setEditInvoiceFile(null)
                        setEditRemoveInvoice(false)
                      }}
                      disabled={!!deletingId}
                    >
                      <IconPencil className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteDistribution}
                      disabled={!!deletingId}
                    >
                      {deletingId === selectedDistribution.id ? (
                        <IconLoader2 className="size-4 animate-spin mr-2" />
                      ) : (
                        <IconTrash className="size-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </>
                )}
              </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
