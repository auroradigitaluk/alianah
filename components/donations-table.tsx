"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconCheck, IconX, IconCircleCheckFilled, IconLoader } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime, formatDonorName } from "@/lib/utils"
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
import { User, Mail, DollarSign, Target, Calendar, CreditCard, Gift, MapPin, FileText } from "lucide-react"

interface Donation {
  id: string
  amountPence: number
  donationType: string
  status: string
  paymentMethod: string
  giftAid: boolean
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  createdAt: Date
  completedAt?: Date | null
  donor: { title?: string | null; firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
  product?: { name: string } | null
}

export function DonationsTable({ donations }: { donations: Donation[] }) {
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)

  return (
    <>
      <AdminTable
        data={donations}
        onRowClick={(donation) => setSelectedDonation(donation)}
        columns={[
        {
          id: "donor",
          header: "Donor Name",
          cell: (donation) => (
            <div className="font-medium">
              {formatDonorName(donation.donor)}
            </div>
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: (donation) => (
            <div className="font-medium">
              {formatCurrency(donation.amountPence)}
            </div>
          ),
        },
        {
          id: "campaign",
          header: "Campaign / Appeal / Product",
          cell: (donation) => (
            <div className="text-sm">
              {donation.product?.name || donation.appeal?.title || "General"}
            </div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (donation) => (
            <Badge
              variant={donation.status === "COMPLETED" ? "default" : "outline"}
              className="px-1.5"
            >
              {donation.status === "COMPLETED" ? (
                <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
              ) : (
                <IconLoader className="mr-1 size-3" />
              )}
              {formatEnum(donation.status)}
            </Badge>
          ),
        },
        {
          id: "date",
          header: "Date",
          cell: (donation) => (
            <div className="text-sm">
              {formatDate(donation.completedAt || donation.createdAt)}
            </div>
          ),
        },
        {
          id: "giftAid",
          header: "Gift Aid",
          cell: (donation) => (
            <div className="flex items-center">
              {donation.giftAid ? (
                <IconCheck className="h-4 w-4 text-primary" />
              ) : (
                <IconX className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ),
        },
        {
          id: "billingAddress",
          header: "Billing Address",
          cell: (donation) => (
            <div className="text-xs max-w-[150px]">
              {donation.billingAddress ? (
                <>
                  <div className="font-medium truncate" title={donation.billingAddress}>
                    {donation.billingAddress}
                  </div>
                  <div className="text-muted-foreground">
                    {donation.billingCity && `${donation.billingCity}, `}
                    {donation.billingPostcode} {donation.billingCountry}
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <Dialog
        open={!!selectedDonation}
        onOpenChange={(open) => !open && setSelectedDonation(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              Donation Details
            </DialogTitle>
            <DialogDescription>
              {selectedDonation && formatCurrency(selectedDonation.amountPence)} donation from {selectedDonation && formatDonorName(selectedDonation.donor)}
            </DialogDescription>
          </DialogHeader>

          {selectedDonation && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4 border-b">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
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
                            {formatCurrency(selectedDonation.amountPence)}
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
                          <Badge
                            variant={selectedDonation.status === "COMPLETED" ? "default" : "outline"}
                            className="px-1.5"
                          >
                            {selectedDonation.status === "COMPLETED" ? (
                              <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
                            ) : (
                              <IconLoader className="mr-1 size-3" />
                            )}
                            {formatEnum(selectedDonation.status)}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-green-500/5 via-card to-card border-green-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Gift Aid
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="flex items-center gap-2">
                            {selectedDonation.giftAid ? (
                              <>
                                <IconCheck className="h-5 w-5 text-primary" />
                                <span className="text-lg font-semibold">Yes</span>
                              </>
                            ) : (
                              <>
                                <IconX className="h-5 w-5 text-muted-foreground" />
                                <span className="text-lg font-semibold">No</span>
                              </>
                            )}
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
                              <p className="text-base font-semibold text-foreground">{formatDonorName(selectedDonation.donor)}</p>
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
                              <p className="text-base text-foreground break-all">{selectedDonation.donor.email}</p>
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
                                Campaign / Appeal / Product
                              </p>
                              <p className="text-base font-semibold text-foreground">
                                {selectedDonation.product?.name || selectedDonation.appeal?.title || "General"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Date
                              </p>
                              <p className="text-base text-foreground">
                                {formatDateTime(selectedDonation.completedAt || selectedDonation.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-6 mt-0">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Donation Details</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Donation Type
                              </p>
                              <p className="text-base font-semibold text-foreground">{formatEnum(selectedDonation.donationType)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Payment Method
                              </p>
                              <p className="text-base text-foreground">{formatEnum(selectedDonation.paymentMethod)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Gift className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Gift Aid
                              </p>
                              <div className="flex items-center gap-2">
                                {selectedDonation.giftAid ? (
                                  <>
                                    <IconCheck className="h-4 w-4 text-primary" />
                                    <span className="text-base font-semibold">Yes</span>
                                  </>
                                ) : (
                                  <>
                                    <IconX className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-base font-semibold">No</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {selectedDonation.billingAddress && (
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Billing Address
                                </p>
                                <div className="text-base">
                                  <p className="font-semibold">{selectedDonation.billingAddress}</p>
                                  <p className="text-muted-foreground">
                                    {selectedDonation.billingCity && `${selectedDonation.billingCity}, `}
                                    {selectedDonation.billingPostcode} {selectedDonation.billingCountry}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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
