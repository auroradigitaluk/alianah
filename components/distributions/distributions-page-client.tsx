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
import { IconLoader2, IconPlus, IconWallet, IconReceipt } from "@tabler/icons-react"
import { toast } from "sonner"

type AvailableRow = {
  appealId: string
  appealTitle: string
  totalReceivedPence: number
  distributedPence: number
  availablePence: number
}

type DistributionRow = {
  id: string
  appealId: string
  appealTitle: string
  amountPence: number
  description: string
  country: string
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
  const amountPence = formAmount ? Math.round(parseFloat(formAmount) * 100) : 0
  const remainingAfter =
    selectedAvailable && amountPence > 0
      ? Math.max(0, selectedAvailable.availablePence - amountPence)
      : selectedAvailable?.availablePence ?? 0

  const openLogModal = React.useCallback(() => {
    setFormAppealId("")
    setFormAmount("")
    setFormDescription("")
    setFormCountry("")
    setModalOpen(true)
  }, [])

  const handleLogDistribution = React.useCallback(async () => {
    if (!formAppealId || !formAmount.trim() || !formDescription.trim() || !formCountry.trim()) {
      toast.error("Please fill in appeal, amount, description and country")
      return
    }
    const pence = Math.round(parseFloat(formAmount) * 100)
    if (!Number.isFinite(pence) || pence <= 0) {
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
      const res = await fetch("/api/admin/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appealId: formAppealId,
          amountPence: pence,
          description: formDescription.trim(),
          country: formCountry.trim(),
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
  }, [formAppealId, formAmount, formDescription, formCountry, available, load])

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
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Logged by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributions.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(d.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{d.appealTitle}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(d.amountPence)}
                        </TableCell>
                        <TableCell>{d.description}</TableCell>
                        <TableCell>{d.country}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {d.createdBy
                            ? formatAdminUserName(d.createdBy) || d.createdBy.email
                            : "—"}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log distribution</DialogTitle>
            <DialogDescription>
              Record money spent from an appeal (e.g. convoy to Gaza, water tank). This reduces the
              available to spend for that appeal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              <Label htmlFor="dist-amount">Amount (£)</Label>
              <Input
                id="dist-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 60000 or 500"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
              {selectedAvailable && formAmount && amountPence > 0 && (
                <p className="text-xs text-muted-foreground">
                  Remaining after this: {formatCurrency(remainingAfter)}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-description">Description</Label>
              <Textarea
                id="dist-description"
                placeholder="e.g. Egypt to Gaza convoy, Water tank in Gaza"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dist-country">Country / location</Label>
              <Input
                id="dist-country"
                placeholder="e.g. Gaza, Egypt"
                value={formCountry}
                onChange={(e) => setFormCountry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleLogDistribution} disabled={submitting}>
              {submitting && <IconLoader2 className="size-4 animate-spin mr-2" />}
              Log distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
