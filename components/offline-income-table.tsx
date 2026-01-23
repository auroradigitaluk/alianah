"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconTag, IconCash, IconBuildingBank } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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

  return (
    <>
      <AdminTable
        data={income}
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
          cell: (item) => (
            <Badge 
              variant={item.source === "CASH" ? "default" : "outline"} 
              className={`px-1.5 ${
                item.source === "CASH" 
                  ? "" 
                  : "bg-blue-500 text-white border-blue-500"
              }`}
            >
              {item.source === "CASH" ? (
                <IconCash className="mr-1 size-3" />
              ) : (
                <IconBuildingBank className="mr-1 size-3" />
              )}
              {formatEnum(item.source)}
            </Badge>
          ),
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
