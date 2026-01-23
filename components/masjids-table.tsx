"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { formatCurrency } from "@/lib/utils"
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
import { Building2, User, Phone, Mail, MapPin, DollarSign, Calendar } from "lucide-react"

interface Masjid {
  id: string
  name: string
  city: string
  address: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  collectionCount: number
  totalAmountRaised: number
}

export function MasjidsTable({ masjids }: { masjids: Masjid[] }) {
  const [selectedMasjid, setSelectedMasjid] = useState<Masjid | null>(null)

  return (
    <>
      <AdminTable
        data={masjids}
        onRowClick={(masjid) => setSelectedMasjid(masjid)}
        columns={[
        {
          id: "name",
          header: "Masjid Name",
          cell: (masjid) => (
            <div className="font-medium">{masjid.name}</div>
          ),
        },
        {
          id: "contactName",
          header: "Masjid Contact Name",
          cell: (masjid) => (
            <div className="text-sm">{masjid.contactName || "-"}</div>
          ),
        },
        {
          id: "phone",
          header: "Phone Number",
          cell: (masjid) => (
            <div className="text-sm">{masjid.phone || "-"}</div>
          ),
        },
        {
          id: "email",
          header: "Email",
          cell: (masjid) => (
            <div className="text-sm">{masjid.email || "-"}</div>
          ),
        },
        {
          id: "city",
          header: "City",
          cell: (masjid) => <div className="text-sm">{masjid.city}</div>,
        },
        {
          id: "address",
          header: "Address",
          cell: (masjid) => <div className="text-sm">{masjid.address}</div>,
        },
        {
          id: "collectionCount",
          header: "No of Collections",
          cell: (masjid) => (
            <div className="text-sm">{masjid.collectionCount}</div>
          ),
        },
        {
          id: "totalAmountRaised",
          header: "Amount Raised at Masjid",
          cell: (masjid) => (
            <div className="font-medium">{formatCurrency(masjid.totalAmountRaised)}</div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <Dialog
        open={!!selectedMasjid}
        onOpenChange={(open) => !open && setSelectedMasjid(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedMasjid?.name || "Masjid Details"}
            </DialogTitle>
            <DialogDescription>
              Masjid information and collection statistics
            </DialogDescription>
          </DialogHeader>

          {selectedMasjid && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Raised
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(selectedMasjid.totalAmountRaised)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Collections
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold">
                            {selectedMasjid.collectionCount}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />

                    {/* Masjid Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Masjid Information</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Masjid Name
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedMasjid.name}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Contact Name
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.contactName || "-"}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Phone Number
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.phone || "-"}</p>
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
                              <p className="text-base text-foreground break-all">{selectedMasjid.email || "-"}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                City
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedMasjid.city}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Address
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.address}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="pt-2">
                      <a
                        href={`/admin/masjids/${selectedMasjid.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit Masjid →
                      </a>
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
