"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDate, formatDonorName, formatEnum, formatPaymentMethod, displayDonorEmail } from "@/lib/utils"
import { Gift, Mail, MapPin, Phone, User, Wallet } from "lucide-react"

export interface DonorDonation {
  id: string
  category: string
  amountPence: number
  donationType?: string | null
  frequency?: string | null
  status?: string | null
  paymentMethod?: string | null
  collectedVia?: string | null
  transactionId?: string | null
  orderNumber?: string | null
  giftAid?: boolean | null
  createdAt: string
  completedAt?: string | null
  reference?: string | null
}

export interface DonorDetails {
  id: string
  title?: string | null
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
  totalAmountDonated: number
  totalRecurringAmount: number
  donationCount: number
  recurringDonationCount: number
  giftAidCount: number
  firstDonationAt: string | null
  lastDonationAt: string | null
  donations: DonorDonation[]
}

type Props = {
  donor: DonorDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DonorDetailsDialog({ donor, open, onOpenChange }: Props) {
  const selectedDonorDonations = useMemo(() => {
    if (!donor) return []
    return [...donor.donations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [donor])

  const donorGiftAidLabel = donor
    ? donor.giftAidCount > 0
      ? `Enabled (${donor.giftAidCount} donations)`
      : "Not used"
    : "-"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            {donor ? formatDonorName(donor) : "Donor Details"}
          </DialogTitle>
          <DialogDescription>Donor information and donation history</DialogDescription>
        </DialogHeader>

        {donor && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="donations">Donations</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <TabsContent value="overview" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                      <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Donated</CardTitle>
                      </CardHeader>
                      <CardContent className="px-6 pb-3 pt-0 relative z-10">
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(donor.totalAmountDonated)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="py-2 gap-1">
                      <CardHeader className="pb-0 px-6 pt-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Donations Count</CardTitle>
                      </CardHeader>
                      <CardContent className="px-6 pb-3 pt-0">
                        <div className="text-2xl font-bold">{donor.donationCount}</div>
                      </CardContent>
                    </Card>
                    <Card className="py-2 gap-1">
                      <CardHeader className="pb-0 px-6 pt-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Gift Aid</CardTitle>
                      </CardHeader>
                      <CardContent className="px-6 pb-3 pt-0">
                        <div className="text-2xl font-bold">{donor.giftAidCount}</div>
                      </CardContent>
                    </Card>
                    <Card className="py-2 gap-1">
                      <CardHeader className="pb-0 px-6 pt-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Recurring Active</CardTitle>
                      </CardHeader>
                      <CardContent className="px-6 pb-3 pt-0">
                        <div className="text-2xl font-bold">{donor.recurringDonationCount}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator className="my-6" />

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
                              Name
                            </p>
                            <p className="text-base font-semibold text-foreground">{formatDonorName(donor)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Email
                            </p>
                            <p className="text-base text-foreground break-all">{displayDonorEmail(donor.email)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Phone
                            </p>
                            <p className="text-base text-foreground">{donor.phone || "-"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-0">
                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Address
                            </p>
                            <p className="text-base text-foreground">
                              {[donor.address, donor.city, donor.postcode, donor.country].filter(Boolean).join(", ") ||
                                "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              First Donation
                            </p>
                            <p className="text-base text-foreground">{formatDate(donor.firstDonationAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Last Donation
                            </p>
                            <p className="text-base text-foreground">{formatDate(donor.lastDonationAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <Gift className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Gift Aid Status
                            </p>
                            <p className="text-base text-foreground">{donorGiftAidLabel}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Total Recurring
                            </p>
                            <p className="text-base text-foreground">
                              {formatCurrency(donor.totalRecurringAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="donations" className="space-y-4 mt-0">
                  <div className="rounded-lg border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Gift Aid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDonorDonations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                              No donations linked to this donor yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedDonorDonations.map((donation) => (
                            <TableRow key={donation.id}>
                              <TableCell className="text-sm">{formatDate(donation.createdAt)}</TableCell>
                              <TableCell className="text-sm">
                                <div className="font-medium">{donation.category}</div>
                                <div className="text-xs text-muted-foreground">
                                  {donation.donationType ? formatEnum(donation.donationType) : "-"}
                                  {donation.frequency ? ` • ${formatEnum(donation.frequency)}` : ""}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{donation.reference || "-"}</TableCell>
                              <TableCell className="text-sm font-medium">
                                {formatCurrency(donation.amountPence)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {donation.status ? <Badge variant="outline">{formatEnum(donation.status)}</Badge> : "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {donation.paymentMethod ? formatPaymentMethod(donation.paymentMethod) : "-"}
                              </TableCell>
                              <TableCell className="text-sm">{donation.giftAid ? "Yes" : "No"}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
