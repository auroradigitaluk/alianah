"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconCalendarEvent } from "@tabler/icons-react"
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
import { Building2, Wallet, Calendar, Target, FileText, StickyNote } from "lucide-react"

interface Collection {
  id: string
  amountPence: number
  donationType: string
  type: string
  collectedAt: Date
  masjid?: { name: string } | null
  appeal?: { title: string } | null
  notes?: string | null
}

export function CollectionsTable({ collections }: { collections: Collection[] }) {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  return (
    <>
      <AdminTable
        data={collections}
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
            <Badge variant="outline" className="text-muted-foreground px-1.5">
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
      ]}
      />
      <Dialog
        open={!!selectedCollection}
        onOpenChange={(open) => !open && setSelectedCollection(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              Collection Details
            </DialogTitle>
            <DialogDescription>
              {selectedCollection && `${formatCurrency(selectedCollection.amountPence)} collected from ${selectedCollection.masjid?.name || "No masjid"}`}
            </DialogDescription>
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
                          <Badge variant="outline" className="text-muted-foreground px-1.5">
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
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
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
    </>
  )
}
