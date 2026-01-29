"use client"

import { useMemo, useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate, formatDonorName, formatEnum, formatPaymentMethod } from "@/lib/utils"
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
import { Gift, Mail, MapPin, Phone, User, Wallet } from "lucide-react"

interface DonorDonation {
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

interface Donor {
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

export function DonorsTable({ donors }: { donors: Donor[] }) {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)
  const [query, setQuery] = useState("")
  const [cityQuery, setCityQuery] = useState("")
  const [countryQuery, setCountryQuery] = useState("")

  const filteredDonors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const normalizedCity = cityQuery.trim().toLowerCase()
    const normalizedCountry = countryQuery.trim().toLowerCase()

    return donors.filter((donor) => {
      const donorName = formatDonorName(donor).toLowerCase()
      const email = donor.email.toLowerCase()
      const matchesQuery = normalizedQuery
        ? donorName.includes(normalizedQuery) || email.includes(normalizedQuery)
        : true
      const matchesCity = normalizedCity
        ? (donor.city || "").toLowerCase().includes(normalizedCity)
        : true
      const matchesCountry = normalizedCountry
        ? (donor.country || "").toLowerCase().includes(normalizedCountry)
        : true

      return matchesQuery && matchesCity && matchesCountry
    })
  }, [cityQuery, countryQuery, donors, query])

  const clearFilters = () => {
    setQuery("")
    setCityQuery("")
    setCountryQuery("")
  }

  const selectedDonorDonations = useMemo(() => {
    if (!selectedDonor) return []
    return [...selectedDonor.donations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [selectedDonor])

  const donorGiftAidLabel = selectedDonor
    ? selectedDonor.giftAidCount > 0
      ? `Enabled (${selectedDonor.giftAidCount} donations)`
      : "Not used"
    : "-"

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="donors-query">Donor name or email</Label>
            <Input
              id="donors-query"
              placeholder="Search donor"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donors-city">City</Label>
            <Input
              id="donors-city"
              placeholder="Filter by city"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donors-country">Country</Label>
            <Input
              id="donors-country"
              placeholder="Filter by country"
              value={countryQuery}
              onChange={(event) => setCountryQuery(event.target.value)}
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
        data={filteredDonors}
        onRowClick={(donor) => setSelectedDonor(donor)}
        columns={[
        {
          id: "name",
          header: "Donor Name",
          cell: (donor) => (
            <div className="font-medium">
              {formatDonorName(donor)}
            </div>
          ),
        },
        {
          id: "email",
          header: "Email",
          cell: (donor) => (
            <div className="text-sm">{donor.email}</div>
          ),
        },
        {
          id: "phone",
          header: "Phone",
          cell: (donor) => (
            <div className="text-sm">{donor.phone || "-"}</div>
          ),
        },
        {
          id: "address",
          header: "Address",
          cell: (donor) => {
            const addressParts = [
              donor.address,
              donor.city,
              donor.postcode,
              donor.country,
            ].filter(Boolean)
            return (
              <div className="text-sm">
                {addressParts.length > 0 ? addressParts.join(", ") : "-"}
              </div>
            )
          },
        },
        {
          id: "amount",
          header: "Amount Donated So Far",
          cell: (donor) => (
            <div className="font-medium">
              {formatCurrency(donor.totalAmountDonated)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <Dialog
        open={!!selectedDonor}
        onOpenChange={(open) => !open && setSelectedDonor(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedDonor ? formatDonorName(selectedDonor) : "Donor Details"}
            </DialogTitle>
            <DialogDescription>
              Donor information and donation history
            </DialogDescription>
          </DialogHeader>

          {selectedDonor && (
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
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Donated
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(selectedDonor.totalAmountDonated)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1">
                        <CardHeader className="pb-0 px-6 pt-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Donations Count
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0">
                          <div className="text-2xl font-bold">{selectedDonor.donationCount}</div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1">
                        <CardHeader className="pb-0 px-6 pt-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Gift Aid
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0">
                          <div className="text-2xl font-bold">{selectedDonor.giftAidCount}</div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1">
                        <CardHeader className="pb-0 px-6 pt-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Recurring Active
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0">
                          <div className="text-2xl font-bold">{selectedDonor.recurringDonationCount}</div>
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
                                Name
                              </p>
                              <p className="text-base font-semibold text-foreground">{formatDonorName(selectedDonor)}</p>
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
                              <p className="text-base text-foreground break-all">{selectedDonor.email}</p>
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
                              <p className="text-base text-foreground">{selectedDonor.phone || "-"}</p>
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
                                {[
                                  selectedDonor.address,
                                  selectedDonor.city,
                                  selectedDonor.postcode,
                                  selectedDonor.country,
                                ]
                                  .filter(Boolean)
                                  .join(", ") || "-"}
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
                              <p className="text-base text-foreground">
                                {formatDate(selectedDonor.firstDonationAt)}
                              </p>
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
                              <p className="text-base text-foreground">
                                {formatDate(selectedDonor.lastDonationAt)}
                              </p>
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
                                {formatCurrency(selectedDonor.totalRecurringAmount)}
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
                                <TableCell className="text-sm">
                                  {formatDate(donation.createdAt)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div className="font-medium">{donation.category}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {donation.donationType ? formatEnum(donation.donationType) : "-"}
                                    {donation.frequency ? ` • ${formatEnum(donation.frequency)}` : ""}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {donation.reference || "-"}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                  {formatCurrency(donation.amountPence)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {donation.status ? (
                                    <Badge variant="outline">{formatEnum(donation.status)}</Badge>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {donation.paymentMethod ? formatPaymentMethod(donation.paymentMethod) : "-"}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {donation.giftAid ? "Yes" : "No"}
                                </TableCell>
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
    </>
  )
}
