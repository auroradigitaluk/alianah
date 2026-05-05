"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  formatCurrency,
  formatDateTime,
  formatDonorName,
  formatEnum,
  formatPaymentMethod,
  displayDonorEmail,
} from "@/lib/utils"
import {
  getQurbaniDonationChannel,
  getQurbaniDonationChannelLabel,
  type QurbaniDonationChannel,
} from "@/lib/qurbani-donation-source"
import { DashboardDateFilter } from "@/components/dashboard-date-filter"
import { Check, CreditCard, Mail, Receipt, ShieldCheck, User, Wallet, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { QurbaniYearStatsCards } from "@/components/qurbani-year-stats-cards"
import { PaymentMethodBadge } from "@/components/payment-method-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type QurbaniDonationRow = {
  id: string
  qurbaniCountryId: string
  fundraiserId: string | null
  size: string
  amountPence: number
  giftAid: boolean
  paymentMethod: string
  collectedVia: string | null
  addedByAdminUserId: string | null
  donationNumber: string | null
  createdAt: string
  qurbaniCountry: { country: string }
  donor: { firstName: string; lastName: string; email: string }
}

const SIZE_LABELS: Record<string, string> = {
  ONE_SEVENTH: "1/7th",
  SMALL: "Small",
  LARGE: "Large",
}

const CHANNEL_BADGE: Record<QurbaniDonationChannel, string> = {
  website: "border-blue-500/40 bg-blue-500/10 text-blue-950 dark:text-blue-100",
  offline: "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
  fundraiser: "border-violet-500/40 bg-violet-500/10 text-violet-950 dark:text-violet-100",
}

type StripeDetails = {
  paymentIntentId?: string | null
  chargeId?: string | null
  status?: string | null
  amount?: number | null
  amountReceived?: number | null
  currency?: string | null
  created?: number | null
  description?: string | null
  receiptEmail?: string | null
  paymentMethodTypes?: string[] | null
  card?: {
    brand?: string | null
    last4?: string | null
    expMonth?: number | null
    expYear?: number | null
    funding?: string | null
    country?: string | null
    network?: string | null
  } | null
  riskLevel?: string | null
  riskScore?: number | null
  fees?: number | null
  net?: number | null
  refunded?: boolean | null
  amountRefunded?: number | null
  subscriptionId?: string | null
  subscriptionStatus?: string | null
  nextPaymentDate?: string | null
}

type DemoOrderSnapshot = {
  orderNumber: string
  subtotalPence: number
  feesPence: number
  totalPence: number
  coverFees: boolean
  giftAid: boolean
  marketingEmail: boolean
  marketingSMS: boolean
  donorFirstName: string
  donorLastName: string
  donorEmail: string
  donorPhone?: string | null
  donorAddress?: string | null
  donorCity?: string | null
  donorPostcode?: string | null
  donorCountry?: string | null
  createdAt: string
}

type QurbaniDonationDetail = {
  id: string
  qurbaniCountryId: string
  fundraiserId: string | null
  size: string
  amountPence: number
  donationType: string
  paymentMethod: string
  collectedVia: string | null
  transactionId: string | null
  giftAid: boolean
  giftAidClaimed: boolean
  giftAidClaimedAt: string | null
  isAnonymous: boolean
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  donationNumber: string | null
  addedByAdminUserId: string | null
  notes: string | null
  qurbaniNames: string | null
  createdAt: string
  donor: {
    title?: string | null
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    address?: string | null
    city?: string | null
    postcode?: string | null
    country?: string | null
  }
  qurbaniCountry: { country: string }
  fundraiser: {
    id: string
    fundraiserName: string
    title: string
    slug: string
  } | null
  addedBy: { email: string; firstName: string | null; lastName: string | null } | null
}

type QurbaniDonationDetailsResponse = {
  donation: QurbaniDonationDetail
  order: DemoOrderSnapshot | null
  stripe: StripeDetails | null
  checkoutOrderNumber: string | null
}

function InfoRow(props: { label: string; value?: string | null; mono?: boolean }) {
  const { label, value, mono } = props
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-border/60 last:border-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-foreground text-right ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  )
}

function QurbaniSourceCell({ donation }: { donation: QurbaniDonationRow }) {
  const channel = getQurbaniDonationChannel(donation)
  return (
    <Badge variant="outline" className={`w-fit px-1.5 ${CHANNEL_BADGE[channel]}`}>
      {getQurbaniDonationChannelLabel(channel)}
    </Badge>
  )
}

export function QurbaniDonationsTab() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("range") != null) return
    const q = new URLSearchParams(searchParams.toString())
    q.set("range", "all")
    router.replace(`${pathname}?${q.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])
  const [donations, setDonations] = useState<QurbaniDonationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [selectedRow, setSelectedRow] = useState<QurbaniDonationRow | null>(null)
  const [details, setDetails] = useState<QurbaniDonationDetailsResponse | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const rangeKey = `${searchParams.get("range") ?? ""}|${searchParams.get("start") ?? ""}|${searchParams.get("end") ?? ""}`

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (name.trim()) params.set("name", name.trim())
      if (country.trim()) params.set("country", country.trim())
      const range = searchParams.get("range")
      const start = searchParams.get("start")
      const end = searchParams.get("end")
      if (range) params.set("range", range)
      else params.set("range", "all")
      if (start) params.set("start", start)
      if (end) params.set("end", end)
      const res = await fetch(`/api/admin/qurbani/donations?${params.toString()}`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Failed to load")
      const data = (await res.json()) as QurbaniDonationRow[]
      setDonations(data)
    } catch (e) {
      setDonations([])
    } finally {
      setLoading(false)
    }
  }, [name, country, rangeKey])

  useEffect(() => {
    fetchDonations()
  }, [fetchDonations])

  const clearFilters = useCallback(() => {
    setName("")
    setCountry("")
  }, [])

  const donationsSorted = useMemo(() => {
    return [...donations].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime()
      const tb = new Date(b.createdAt).getTime()
      if (tb !== ta) return tb - ta
      return b.id.localeCompare(a.id)
    })
  }, [donations])

  useEffect(() => {
    if (!selectedRow) {
      setDetails(null)
      setDetailsError(null)
      return
    }

    const controller = new AbortController()
    const loadDetails = async () => {
      setDetailsLoading(true)
      setDetailsError(null)
      try {
        const response = await fetch(`/api/admin/qurbani/donations/${selectedRow.id}/details`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("Failed to load donation details")
        }
        const data = (await response.json()) as QurbaniDonationDetailsResponse
        setDetails(data)
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetailsError(error instanceof Error ? error.message : "Failed to load details")
        }
      } finally {
        if (!controller.signal.aborted) {
          setDetailsLoading(false)
        }
      }
    }

    void loadDetails()

    return () => controller.abort()
  }, [selectedRow])

  const donation = details?.donation
  const stripeInfo = details?.stripe ?? null
  const order = details?.order ?? null

  return (
    <div className="space-y-4">
      <QurbaniYearStatsCards />
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid flex-1 min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qurbani-donor">Donor name or email</Label>
              <Input
                id="qurbani-donor"
                transform="titleCase"
                placeholder="Search donor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qurbani-country">Country</Label>
              <Input
                id="qurbani-country"
                transform="titleCase"
                placeholder="Filter by country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="block">Date range</Label>
              <DashboardDateFilter />
            </div>
          </div>
          <Button variant="outline" onClick={clearFilters} className="shrink-0">
            Clear filters
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : donationsSorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No qurbani donations found.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Order no.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Gift Aid</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donationsSorted.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedRow(d)}
                >
                  <TableCell className="font-medium">
                    {d.donor.firstName} {d.donor.lastName}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(d.amountPence)}</TableCell>
                  <TableCell>{d.qurbaniCountry.country}</TableCell>
                  <TableCell>{SIZE_LABELS[d.size] ?? d.size}</TableCell>
                  <TableCell>
                    <QurbaniSourceCell donation={d} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {d.donationNumber ? (
                      d.donationNumber
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDateTime(d.createdAt)}
                  </TableCell>
                  <TableCell>
                    {d.giftAid ? (
                      <Check className="h-4 w-4 text-primary" aria-label="Gift Aid yes" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" aria-label="Gift Aid no" />
                    )}
                  </TableCell>
                  <TableCell>
                    <PaymentMethodBadge paymentMethod={d.paymentMethod} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex flex-row items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-semibold">Qurbani donation details</DialogTitle>
              <DialogDescription>
                {selectedRow &&
                  `${formatCurrency(selectedRow.amountPence)} · ${selectedRow.donor.firstName} ${selectedRow.donor.lastName}`}
              </DialogDescription>
            </div>
          </DialogHeader>

          {selectedRow && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {detailsLoading && (
                    <p className="text-sm text-muted-foreground">Loading full donation details…</p>
                  )}
                  {detailsError && <p className="text-sm text-destructive">{detailsError}</p>}

                  <TabsContent value="overview" className="space-y-8 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <Receipt className="h-4 w-4" />
                          Donation
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow
                            label="Amount"
                            value={donation ? formatCurrency(donation.amountPence) : formatCurrency(selectedRow.amountPence)}
                          />
                          <InfoRow
                            label="Donation type"
                            value={donation ? formatEnum(donation.donationType) : "—"}
                          />
                          <InfoRow
                            label="Size"
                            value={
                              donation ? SIZE_LABELS[donation.size] ?? donation.size : SIZE_LABELS[selectedRow.size] ?? selectedRow.size
                            }
                          />
                          <InfoRow
                            label="Country"
                            value={donation?.qurbaniCountry.country ?? selectedRow.qurbaniCountry.country}
                          />
                          <InfoRow label="Names on certificate" value={donation?.qurbaniNames || "—"} />
                          <InfoRow label="Gift Aid" value={donation ? (donation.giftAid ? "Yes" : "No") : selectedRow.giftAid ? "Yes" : "No"} />
                          <InfoRow
                            label="Order / donation no."
                            value={donation?.donationNumber ?? selectedRow.donationNumber ?? "—"}
                            mono
                          />
                          <InfoRow
                            label="Source"
                            value={getQurbaniDonationChannelLabel(getQurbaniDonationChannel(selectedRow))}
                          />
                          <InfoRow
                            label="Collected via"
                            value={donation?.collectedVia ? formatEnum(donation.collectedVia) : selectedRow.collectedVia ? formatEnum(selectedRow.collectedVia) : "—"}
                          />
                          <InfoRow
                            label="Anonymous"
                            value={donation ? (donation.isAnonymous ? "Yes" : "No") : "—"}
                          />
                          <InfoRow
                            label="Created"
                            value={
                              donation
                                ? formatDateTime(donation.createdAt)
                                : formatDateTime(selectedRow.createdAt)
                            }
                          />
                          {donation?.addedBy && (
                            <InfoRow
                              label="Added by (office)"
                              value={
                                [donation.addedBy.firstName, donation.addedBy.lastName].filter(Boolean).join(" ") ||
                                donation.addedBy.email
                              }
                            />
                          )}
                          <InfoRow label="Internal notes" value={donation?.notes || "—"} />
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <User className="h-4 w-4" />
                          Donor
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow
                            label="Name"
                            value={
                              donation
                                ? formatDonorName(donation.donor)
                                : `${selectedRow.donor.firstName} ${selectedRow.donor.lastName}`
                            }
                          />
                          <InfoRow
                            label="Email"
                            value={
                              donation
                                ? displayDonorEmail(donation.donor.email)
                                : displayDonorEmail(selectedRow.donor.email)
                            }
                          />
                          <InfoRow label="Phone" value={donation?.donor.phone || "—"} />
                          <InfoRow
                            label="Address"
                            value={
                              donation?.donor.address
                                ? `${donation.donor.address}${donation.donor.city ? `, ${donation.donor.city}` : ""}${donation.donor.postcode ? ` ${donation.donor.postcode}` : ""}${donation.donor.country ? `, ${donation.donor.country}` : ""}`
                                : "—"
                            }
                          />
                          <InfoRow
                            label="Billing address"
                            value={
                              donation?.billingAddress
                                ? `${donation.billingAddress}${donation.billingCity ? `, ${donation.billingCity}` : ""}${donation.billingPostcode ? ` ${donation.billingPostcode}` : ""}${donation.billingCountry ? `, ${donation.billingCountry}` : ""}`
                                : "—"
                            }
                          />
                        </div>

                        {donation?.fundraiser && (
                          <section className="space-y-3 pt-2">
                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                              Fundraiser page
                            </div>
                            <div className="rounded-lg border border-border/60 px-4">
                              <InfoRow label="Name" value={donation.fundraiser.fundraiserName} />
                              <InfoRow label="Title" value={donation.fundraiser.title} />
                              <InfoRow label="Slug" value={donation.fundraiser.slug} mono />
                            </div>
                          </section>
                        )}
                      </section>
                    </div>
                  </TabsContent>

                  <TabsContent value="payment" className="space-y-8 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <Wallet className="h-4 w-4" />
                          Payment
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow
                            label="Payment method"
                            value={
                              donation
                                ? formatPaymentMethod(donation.paymentMethod)
                                : formatPaymentMethod(selectedRow.paymentMethod)
                            }
                          />
                          <InfoRow
                            label="Donation reference"
                            value={donation?.donationNumber ?? selectedRow.donationNumber ?? "—"}
                            mono
                          />
                          <InfoRow label="Stripe / transaction ID" value={donation?.transactionId || "—"} mono />
                          <InfoRow label="Payment ID" value={stripeInfo?.paymentIntentId || "—"} mono />
                          <InfoRow label="Charge ID" value={stripeInfo?.chargeId || "—"} mono />
                          <InfoRow label="Stripe status" value={stripeInfo?.status || "—"} />
                          <InfoRow label="Receipt email" value={stripeInfo?.receiptEmail || "—"} />
                          <InfoRow label="Description" value={stripeInfo?.description || "—"} />
                          <InfoRow
                            label="Payment created"
                            value={
                              stripeInfo?.created ? formatDateTime(new Date(stripeInfo.created * 1000)) : "—"
                            }
                          />
                          <InfoRow
                            label="Amount charged"
                            value={
                              stripeInfo?.amount != null && stripeInfo?.currency
                                ? formatCurrency(stripeInfo.amount)
                                : "—"
                            }
                          />
                          <InfoRow
                            label="Amount refunded"
                            value={
                              stripeInfo?.amountRefunded
                                ? formatCurrency(stripeInfo.amountRefunded)
                                : stripeInfo?.refunded
                                  ? formatCurrency(stripeInfo.amount || 0)
                                  : "—"
                            }
                          />
                          <InfoRow
                            label="Fees"
                            value={stripeInfo?.fees != null ? formatCurrency(stripeInfo.fees) : "—"}
                          />
                          <InfoRow
                            label="Net"
                            value={stripeInfo?.net != null ? formatCurrency(stripeInfo.net) : "—"}
                          />
                          <InfoRow label="Subscription ID" value={stripeInfo?.subscriptionId || "—"} mono />
                          <InfoRow label="Subscription status" value={stripeInfo?.subscriptionStatus || "—"} />
                          <InfoRow
                            label="Next payment"
                            value={stripeInfo?.nextPaymentDate ? formatDateTime(stripeInfo.nextPaymentDate) : "—"}
                          />
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          Card & risk
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow
                            label="Card"
                            value={
                              stripeInfo?.card?.brand
                                ? `${formatEnum(stripeInfo.card.brand)} •••• ${stripeInfo.card.last4}`
                                : "—"
                            }
                          />
                          <InfoRow
                            label="Expiry"
                            value={
                              stripeInfo?.card?.expMonth && stripeInfo?.card?.expYear
                                ? `${stripeInfo.card.expMonth}/${stripeInfo.card.expYear}`
                                : "—"
                            }
                          />
                          <InfoRow
                            label="Funding"
                            value={stripeInfo?.card?.funding ? formatEnum(stripeInfo.card.funding) : "—"}
                          />
                          <InfoRow label="Card country" value={stripeInfo?.card?.country || "—"} />
                          <InfoRow label="Network" value={stripeInfo?.card?.network || "—"} />
                          <InfoRow label="Risk level" value={stripeInfo?.riskLevel || "—"} />
                          <InfoRow
                            label="Risk score"
                            value={stripeInfo?.riskScore != null ? `${stripeInfo.riskScore}` : "—"}
                          />
                        </div>
                      </section>
                    </div>
                  </TabsContent>

                  <TabsContent value="metadata" className="space-y-8 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <ShieldCheck className="h-4 w-4" />
                          Checkout session
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow
                            label="Checkout order no."
                            value={details?.checkoutOrderNumber || "—"}
                            mono
                          />
                          <InfoRow label="Cover fees" value={order ? (order.coverFees ? "Yes" : "No") : "—"} />
                          <InfoRow label="Marketing email" value={order ? (order.marketingEmail ? "Yes" : "No") : "—"} />
                          <InfoRow label="Marketing SMS" value={order ? (order.marketingSMS ? "Yes" : "No") : "—"} />
                          <InfoRow label="Gift Aid (checkout)" value={order ? (order.giftAid ? "Yes" : "No") : "—"} />
                          <InfoRow
                            label="Checkout created"
                            value={order ? formatDateTime(new Date(order.createdAt)) : "—"}
                          />
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          Donor snapshot (checkout)
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow
                            label="Name"
                            value={order ? `${order.donorFirstName} ${order.donorLastName}` : "—"}
                          />
                          <InfoRow label="Email" value={order?.donorEmail || "—"} />
                          <InfoRow label="Phone" value={order?.donorPhone || "—"} />
                          <InfoRow
                            label="Address"
                            value={
                              order?.donorAddress
                                ? `${order.donorAddress}${order.donorCity ? `, ${order.donorCity}` : ""}${order.donorPostcode ? ` ${order.donorPostcode}` : ""}${order.donorCountry ? `, ${order.donorCountry}` : ""}`
                                : "—"
                            }
                          />
                          <InfoRow
                            label="Totals"
                            value={
                              order
                                ? `${formatCurrency(order.subtotalPence)} + ${formatCurrency(order.feesPence)} fees = ${formatCurrency(order.totalPence)}`
                                : "—"
                            }
                          />
                        </div>
                      </section>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
