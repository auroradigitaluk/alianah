"use client"

import { useMemo, useState } from "react"
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
import { Wallet, Target, Calendar, FileText, StickyNote } from "lucide-react"

interface OfflineIncome {
  id: string
  amountPence: number
  donationType: string
  source: string
  receivedAt: Date
  appeal?: { title: string } | null
  notes?: string | null
}

export function OfflineIncomeTable({ income }: { income: OfflineIncome[] }) {
  const [selectedIncome, setSelectedIncome] = useState<OfflineIncome | null>(null)
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

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="offline-appeal">Appeal</Label>
            <Input
              id="offline-appeal"
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
      ]}
      enableSelection={false}
      />
      <Dialog
        open={!!selectedIncome}
        onOpenChange={(open) => !open && setSelectedIncome(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              Offline Income Details
            </DialogTitle>
            <DialogDescription>
              {selectedIncome && `${formatCurrency(selectedIncome.amountPence)} from ${formatEnum(selectedIncome.source)}`}
            </DialogDescription>
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
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
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
    </>
  )
}
