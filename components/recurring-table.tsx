"use client"

import { useMemo, useState } from "react"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconPlayerPause, IconX, IconLoader } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDonorName } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { User, Mail, Wallet, Target, Calendar, RefreshCw, FileText } from "lucide-react"
import { toast } from "sonner"

interface RecurringDonation {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  subscriptionId?: string | null
  nextPaymentDate?: Date | null
  lastPaymentDate?: Date | null
  donor: { title?: string | null; firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
}

export function RecurringTable({ recurring }: { recurring: RecurringDonation[] }) {
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringDonation | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [appealQuery, setAppealQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const statusOptions = useMemo(
    () => Array.from(new Set(recurring.map((item) => item.status))).sort(),
    [recurring]
  )

  const filteredRecurring = useMemo(() => {
    const normalizedAppeal = appealQuery.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    if (from) from.setHours(0, 0, 0, 0)
    if (to) to.setHours(23, 59, 59, 999)

    return recurring.filter((item) => {
      const appealName = (item.appeal?.title || "General").toLowerCase()
      const matchesAppeal = normalizedAppeal
        ? appealName.includes(normalizedAppeal)
        : true
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      const dateValue = item.nextPaymentDate ? new Date(item.nextPaymentDate) : null
      const matchesDate =
        (!from || (dateValue && dateValue >= from)) &&
        (!to || (dateValue && dateValue <= to))

      return matchesAppeal && matchesStatus && matchesDate
    })
  }, [appealQuery, fromDate, recurring, statusFilter, toDate])

  const clearFilters = () => {
    setAppealQuery("")
    setStatusFilter("all")
    setFromDate("")
    setToDate("")
  }

  const cancelSubscription = async () => {
    if (!selectedRecurring?.id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/recurring/${selectedRecurring.id}/cancel`, {
        method: "POST",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to cancel subscription")
      toast.success("Subscription cancelled")
      // Refresh to reflect updated status
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel subscription")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="recurring-appeal">Appeal</Label>
            <Input
              id="recurring-appeal"
              transform="titleCase"
              placeholder="Search appeal"
              value={appealQuery}
              onChange={(event) => setAppealQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatEnum(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurring-from">Next payment from</Label>
            <Input
              id="recurring-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurring-to">Next payment to</Label>
            <Input
              id="recurring-to"
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
        data={filteredRecurring}
        onRowClick={(item) => setSelectedRecurring(item)}
        columns={[
        {
          id: "donor",
          header: "Donor Name",
          cell: (item) => (
            <div className="font-medium">
              {formatDonorName(item.donor)}
            </div>
          ),
        },
        {
          id: "campaign",
          header: "Campaign / Appeal",
          cell: (item) => (
            <div className="text-sm">
              {item.appeal?.title || "General"}
            </div>
          ),
        },
        {
          id: "stripeSub",
          header: "Stripe Sub",
          cell: (item) => (
            <div className="text-xs font-mono">
              {item.subscriptionId ? (
                <span title={item.subscriptionId}>{item.subscriptionId.slice(0, 14)}…</span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: (item) => (
            <div className="font-medium">
              {formatCurrency(item.amountPence)} / {formatEnum(item.frequency).toLowerCase()}
            </div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (item) => {
            if (item.status === "ACTIVE") {
              return <StatusBadge isActive={true} />
            } else if (item.status === "PAUSED") {
              return (
                <Badge variant="outline" className="px-1.5 bg-orange-500 text-white border-orange-500">
                  <IconPlayerPause className="mr-1 size-3" />
                  {formatEnum(item.status)}
                </Badge>
              )
            } else if (item.status === "CANCELLED" || item.status === "FAILED") {
              return (
                <Badge variant="outline" className="px-1.5 bg-red-500 text-white border-red-500">
                  <IconX className="mr-1 size-3" />
                  {formatEnum(item.status)}
                </Badge>
              )
            } else {
              return (
                <Badge variant="outline" className="px-1.5 text-muted-foreground bg-muted">
                  <IconLoader className="mr-1 size-3" />
                  {formatEnum(item.status)}
                </Badge>
              )
            }
          },
        },
        {
          id: "nextPayment",
          header: "Next Payment",
          cell: (item) => (
            <div className="text-sm">
              {formatDate(item.nextPaymentDate)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <Dialog
        open={!!selectedRecurring}
        onOpenChange={(open) => !open && setSelectedRecurring(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Recurring Donation Details
                </DialogTitle>
                <DialogDescription>
                  {selectedRecurring && `${formatCurrency(selectedRecurring.amountPence)} / ${formatEnum(selectedRecurring.frequency).toLowerCase()} from ${formatDonorName(selectedRecurring.donor)}`}
                </DialogDescription>
              </div>
              {selectedRecurring?.status === "ACTIVE" && selectedRecurring.subscriptionId && (
                <Button
                  variant="destructive"
                  onClick={cancelSubscription}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Cancelling..." : "Cancel subscription"}
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedRecurring && (
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Amount
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(selectedRecurring.amountPence)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            per {formatEnum(selectedRecurring.frequency).toLowerCase()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          {selectedRecurring.status === "ACTIVE" ? (
                            <StatusBadge isActive={true} />
                          ) : selectedRecurring.status === "PAUSED" ? (
                            <Badge variant="outline" className="px-1.5 bg-orange-500 text-white border-orange-500">
                              <IconPlayerPause className="mr-1 size-3" />
                              {formatEnum(selectedRecurring.status)}
                            </Badge>
                          ) : selectedRecurring.status === "CANCELLED" || selectedRecurring.status === "FAILED" ? (
                            <Badge variant="outline" className="px-1.5 bg-red-500 text-white border-red-500">
                              <IconX className="mr-1 size-3" />
                              {formatEnum(selectedRecurring.status)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="px-1.5 text-muted-foreground bg-muted">
                              <IconLoader className="mr-1 size-3" />
                              {formatEnum(selectedRecurring.status)}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-green-500/5 via-card to-card border-green-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Next Payment
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-lg font-bold">
                            {formatDate(selectedRecurring.nextPaymentDate)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />

                    {/* Donor Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Donor Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Donor Name
                              </p>
                              <p className="text-base font-semibold text-foreground">{formatDonorName(selectedRecurring.donor)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Email
                              </p>
                              <p className="text-base text-foreground break-all">{selectedRecurring.donor.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Campaign / Appeal
                              </p>
                              <p className="text-base font-semibold text-foreground">
                                {selectedRecurring.appeal?.title || "General"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Donation Type
                              </p>
                              <p className="text-base text-foreground">{formatEnum(selectedRecurring.donationType)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* Payment Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Payment Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Next Payment
                              </p>
                              <p className="text-base font-semibold text-foreground">
                                {formatDate(selectedRecurring.nextPaymentDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {selectedRecurring.lastPaymentDate && (
                          <div className="space-y-0">
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Last Payment
                                </p>
                                <p className="text-base font-semibold text-foreground">
                                  {formatDate(selectedRecurring.lastPaymentDate)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedRecurring.subscriptionId && (
                        <div className="text-xs text-muted-foreground">
                          Stripe subscription ID: <span className="font-mono">{selectedRecurring.subscriptionId}</span>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
