"use client"

import { useState } from "react"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconPlayerPause, IconX, IconLoader } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDonorName } from "@/lib/utils"
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
import { User, Mail, DollarSign, Target, Calendar, RefreshCw, FileText } from "lucide-react"

interface RecurringDonation {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  nextPaymentDate?: Date | null
  lastPaymentDate?: Date | null
  donor: { title?: string | null; firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
}

export function RecurringTable({ recurring }: { recurring: RecurringDonation[] }) {
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringDonation | null>(null)

  return (
    <>
      <AdminTable
        data={recurring}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              Recurring Donation Details
            </DialogTitle>
            <DialogDescription>
              {selectedRecurring && `${formatCurrency(selectedRecurring.amountPence)} / ${formatEnum(selectedRecurring.frequency).toLowerCase()} from ${formatDonorName(selectedRecurring.donor)}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRecurring && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4 border-b">
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
