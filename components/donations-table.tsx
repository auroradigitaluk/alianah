"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  IconArrowBackUp,
  IconCheck,
  IconCircleCheckFilled,
  IconLoader,
  IconX,
} from "@tabler/icons-react"
import {
  formatCurrency,
  formatEnum,
  formatDate,
  formatDateTime,
  formatDonorName,
  formatPaymentMethod,
} from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Calendar,
  CreditCard,
  FileText,
  Gift,
  Mail,
  MapPin,
  Receipt,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react"

interface Donation {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  paymentMethod: string
  collectedVia?: string | null
  transactionId?: string | null
  orderNumber?: string | null
  giftAid: boolean
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  createdAt: Date
  completedAt?: Date | null
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
  appeal?: { title: string } | null
  product?: { name: string } | null
  fundraiser?: { fundraiserName: string; title: string; slug: string } | null
}

type StripeInfo = {
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

type DemoOrder = {
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

type DonationDetailsResponse = {
  donation: Donation
  order: DemoOrder | null
  stripe: StripeInfo | null
}

function InfoRow(props: { label: string; value?: string | null; mono?: boolean }) {
  const { label, value, mono } = props
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-border/60 last:border-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-foreground text-right ${mono ? "font-mono" : ""}`}>
        {value || "-"}
      </p>
    </div>
  )
}

export function DonationsTable({ donations }: { donations: Donation[] }) {
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)
  const [details, setDetails] = useState<DonationDetailsResponse | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refundType, setRefundType] = useState<"full" | "partial">("full")
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [appealQuery, setAppealQuery] = useState("")
  const [nameQuery, setNameQuery] = useState("")
  const [orderQuery, setOrderQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    if (!selectedDonation) {
      setDetails(null)
      setDetailsError(null)
      return
    }

    const controller = new AbortController()
    const loadDetails = async () => {
      setDetailsLoading(true)
      setDetailsError(null)
      try {
        const response = await fetch(`/api/admin/donations/${selectedDonation.id}/details`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("Failed to load donation details")
        }
        const data = (await response.json()) as DonationDetailsResponse
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
  }, [selectedDonation])

  const stripeInfo = details?.stripe || null
  const donation = details?.donation || selectedDonation
  const order = details?.order || null
  const canRefund =
    Boolean(stripeInfo?.paymentIntentId) &&
    stripeInfo?.status === "succeeded" &&
    !stripeInfo?.refunded &&
    !stripeInfo?.subscriptionId

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(donations.map((donation) => donation.status))).sort(),
    [donations]
  )

  const filteredDonations = useMemo(() => {
    const normalizedAppeal = appealQuery.trim().toLowerCase()
    const normalizedName = nameQuery.trim().toLowerCase()
    const normalizedOrder = orderQuery.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null
    if (from) from.setHours(0, 0, 0, 0)
    if (to) to.setHours(23, 59, 59, 999)

    return donations.filter((donation) => {
      const appealName = (donation.appeal?.title || "General").toLowerCase()
      const matchesAppeal = normalizedAppeal
        ? appealName.includes(normalizedAppeal)
        : true
      const donorName = formatDonorName(donation.donor).toLowerCase()
      const matchesName = normalizedName
        ? donorName.includes(normalizedName)
        : true
      const orderNumber = (donation.orderNumber || "").toLowerCase()
      const matchesOrder = normalizedOrder
        ? orderNumber.includes(normalizedOrder)
        : true
      const matchesStatus =
        statusFilter === "all" || donation.status === statusFilter
      const rawDate = donation.completedAt || donation.createdAt
      const dateValue = rawDate ? new Date(rawDate) : null
      const matchesDate =
        (!from || (dateValue && dateValue >= from)) &&
        (!to || (dateValue && dateValue <= to))

      return matchesAppeal && matchesName && matchesOrder && matchesStatus && matchesDate
    })
  }, [appealQuery, donations, fromDate, nameQuery, orderQuery, statusFilter, toDate])

  const clearFilters = () => {
    setAppealQuery("")
    setNameQuery("")
    setOrderQuery("")
    setStatusFilter("all")
    setFromDate("")
    setToDate("")
  }

  const handleRefund = async () => {
    if (!donation || !canRefund || refundLoading) return

    setRefundLoading(true)
    setRefundError(null)

    try {
      const amountPence =
        refundType === "partial" ? Math.round(parseFloat(refundAmount || "0") * 100) : undefined
      if (refundType === "partial" && (!amountPence || amountPence <= 0)) {
        throw new Error("Enter a valid partial refund amount.")
      }
      if (!refundReason.trim()) {
        throw new Error("Please enter a reason for the refund.")
      }
      const response = await fetch(`/api/admin/donations/${donation.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: refundType,
          amountPence,
          reason: refundReason.trim(),
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Refund failed")
      }
      const refreshed = (await response.json()) as DonationDetailsResponse
      setDetails(refreshed)
      setRefundDialogOpen(false)
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : "Refund failed")
    } finally {
      setRefundLoading(false)
    }
  }

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="donations-name">Donor name</Label>
            <Input
              id="donations-name"
              placeholder="Search donor"
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donations-order">Order number</Label>
            <Input
              id="donations-order"
              placeholder="Search order"
              value={orderQuery}
              onChange={(event) => setOrderQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donations-appeal">Appeal</Label>
            <Input
              id="donations-appeal"
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
            <Label htmlFor="donations-from">From</Label>
            <Input
              id="donations-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donations-to">To</Label>
            <Input
              id="donations-to"
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
        data={filteredDonations}
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
          id: "orderNumber",
          header: "Order No.",
          cell: (donation) => (
            <div className="text-xs font-mono">
              {donation.orderNumber || <span className="text-muted-foreground">-</span>}
            </div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (donation) => (
            <Badge
              variant={donation.status === "COMPLETED" ? "default" : "outline"}
              className={
                donation.status === "REFUNDED"
                  ? "px-1.5 bg-orange-500 text-white border-orange-500"
                  : donation.status === "FAILED"
                    ? "px-1.5 bg-red-500 text-white border-red-500"
                    : "px-1.5"
              }
            >
              {donation.status === "COMPLETED" ? (
                <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
              ) : donation.status === "REFUNDED" ? (
                <IconArrowBackUp className="mr-1 size-3" />
              ) : donation.status === "FAILED" ? (
                <IconX className="mr-1 size-3" />
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
        <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex flex-row items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-semibold">Donation Details</DialogTitle>
              <DialogDescription>
                {donation && `${formatCurrency(donation.amountPence)} donation from ${formatDonorName(donation.donor)}`}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {donation && (
                <Badge
                  variant={donation.status === "COMPLETED" ? "default" : "outline"}
                  className={
                    donation.status === "REFUNDED"
                      ? "px-2 bg-orange-500 text-white border-orange-500"
                      : donation.status === "FAILED"
                        ? "px-2 bg-red-500 text-white border-red-500"
                        : "px-2"
                  }
                >
                  {donation.status === "COMPLETED" ? (
                    <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
                  ) : donation.status === "REFUNDED" ? (
                    <IconArrowBackUp className="mr-1 size-3" />
                  ) : donation.status === "FAILED" ? (
                    <IconX className="mr-1 size-3" />
                  ) : (
                    <IconLoader className="mr-1 size-3" />
                  )}
                  {formatEnum(donation.status)}
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRefundType("full")
                  setRefundAmount("")
                  setRefundReason("")
                  setRefundDialogOpen(true)
                }}
                disabled={!canRefund || refundLoading}
              >
                {refundLoading ? "Refunding..." : "Refund"}
              </Button>
            </div>
          </DialogHeader>

          {donation && (
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
                  {detailsError && (
                    <p className="text-sm text-destructive">{detailsError}</p>
                  )}
                  {refundError && (
                    <p className="text-sm text-destructive">{refundError}</p>
                  )}

                  <TabsContent value="overview" className="space-y-8 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <Receipt className="h-4 w-4" />
                          Donation
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow label="Amount" value={formatCurrency(donation.amountPence)} />
                          <InfoRow label="Donation Type" value={formatEnum(donation.donationType)} />
                          <InfoRow label="Frequency" value={formatEnum(donation.frequency)} />
                          <InfoRow label="Campaign / Appeal / Product" value={donation.product?.name || donation.appeal?.title || "General"} />
                          <InfoRow label="Fundraiser" value={donation.fundraiser?.fundraiserName || "-"} />
                          <InfoRow label="Gift Aid" value={donation.giftAid ? "Yes" : "No"} />
                          <InfoRow label="Collected Via" value={donation.collectedVia ? formatEnum(donation.collectedVia) : "-"} />
                          <InfoRow label="Created" value={formatDateTime(donation.createdAt)} />
                          <InfoRow label="Completed" value={donation.completedAt ? formatDateTime(donation.completedAt) : "-"} />
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <User className="h-4 w-4" />
                          Donor
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow label="Name" value={formatDonorName(donation.donor)} />
                          <InfoRow label="Email" value={donation.donor.email} />
                          <InfoRow label="Phone" value={donation.donor.phone || "-"} />
                          <InfoRow
                            label="Address"
                            value={
                              donation.donor.address
                                ? `${donation.donor.address}${donation.donor.city ? `, ${donation.donor.city}` : ""}${donation.donor.postcode ? ` ${donation.donor.postcode}` : ""}${donation.donor.country ? `, ${donation.donor.country}` : ""}`
                                : "-"
                            }
                          />
                          <InfoRow
                            label="Billing Address"
                            value={
                              donation.billingAddress
                                ? `${donation.billingAddress}${donation.billingCity ? `, ${donation.billingCity}` : ""}${donation.billingPostcode ? ` ${donation.billingPostcode}` : ""}${donation.billingCountry ? `, ${donation.billingCountry}` : ""}`
                                : "-"
                            }
                          />
                        </div>
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
                          <InfoRow label="Payment Method" value={formatPaymentMethod(donation.paymentMethod)} />
                          <InfoRow label="Order Number" value={donation.orderNumber || "-"} mono />
                          <InfoRow label="Stripe Reference" value={donation.transactionId || "-"} mono />
                          <InfoRow label="Payment ID" value={stripeInfo?.paymentIntentId || "-"} mono />
                          <InfoRow label="Charge ID" value={stripeInfo?.chargeId || "-"} mono />
                          <InfoRow label="Stripe Status" value={stripeInfo?.status || "-"} />
                          <InfoRow label="Receipt Email" value={stripeInfo?.receiptEmail || "-"} />
                          <InfoRow label="Description" value={stripeInfo?.description || "-"} />
                          <InfoRow
                            label="Payment Created"
                            value={
                              stripeInfo?.created ? formatDateTime(new Date(stripeInfo.created * 1000)) : "-"
                            }
                          />
                          <InfoRow
                            label="Amount Charged"
                            value={
                              stripeInfo?.amount != null && stripeInfo?.currency
                                ? formatCurrency(stripeInfo.amount)
                                : "-"
                            }
                          />
                          <InfoRow
                            label="Amount Refunded"
                            value={
                              stripeInfo?.amountRefunded
                                ? formatCurrency(stripeInfo.amountRefunded)
                                : stripeInfo?.refunded
                                  ? formatCurrency(stripeInfo.amount || 0)
                                  : "-"
                            }
                          />
                          <InfoRow
                            label="Fees"
                            value={
                              stripeInfo?.fees != null ? formatCurrency(stripeInfo.fees) : "-"
                            }
                          />
                          <InfoRow
                            label="Net"
                            value={
                              stripeInfo?.net != null ? formatCurrency(stripeInfo.net) : "-"
                            }
                          />
                          <InfoRow label="Subscription ID" value={stripeInfo?.subscriptionId || "-"} mono />
                          <InfoRow label="Subscription Status" value={stripeInfo?.subscriptionStatus || "-"} />
                          <InfoRow
                            label="Next Payment Date"
                            value={stripeInfo?.nextPaymentDate ? formatDateTime(stripeInfo.nextPaymentDate) : "-"}
                          />
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          Card & Risk
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow
                            label="Card"
                            value={
                              stripeInfo?.card?.brand
                                ? `${formatEnum(stripeInfo.card.brand)} •••• ${stripeInfo.card.last4}`
                                : "-"
                            }
                          />
                          <InfoRow
                            label="Expiry"
                            value={
                              stripeInfo?.card?.expMonth && stripeInfo?.card?.expYear
                                ? `${stripeInfo.card.expMonth}/${stripeInfo.card.expYear}`
                                : "-"
                            }
                          />
                          <InfoRow label="Funding" value={stripeInfo?.card?.funding ? formatEnum(stripeInfo.card.funding) : "-"} />
                          <InfoRow label="Card Country" value={stripeInfo?.card?.country || "-"} />
                          <InfoRow label="Network" value={stripeInfo?.card?.network || "-"} />
                          <InfoRow label="Risk Level" value={stripeInfo?.riskLevel || "-"} />
                          <InfoRow label="Risk Score" value={stripeInfo?.riskScore != null ? `${stripeInfo.riskScore}` : "-"} />
                        </div>
                      </section>
                    </div>
                  </TabsContent>

                  <TabsContent value="metadata" className="space-y-8 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <ShieldCheck className="h-4 w-4" />
                          Checkout Metadata
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow label="Cover Fees" value={order ? (order.coverFees ? "Yes" : "No") : "-"} />
                          <InfoRow label="Marketing Email" value={order ? (order.marketingEmail ? "Yes" : "No") : "-"} />
                          <InfoRow label="Marketing SMS" value={order ? (order.marketingSMS ? "Yes" : "No") : "-"} />
                          <InfoRow label="Gift Aid" value={order ? (order.giftAid ? "Yes" : "No") : "-"} />
                          <InfoRow label="Checkout Created" value={order ? formatDateTime(new Date(order.createdAt)) : "-"} />
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          Donor Snapshot
                        </div>
                        <div className="rounded-lg border border-border/60 px-4">
                          <InfoRow label="Name" value={order ? `${order.donorFirstName} ${order.donorLastName}` : "-"} />
                          <InfoRow label="Email" value={order?.donorEmail || "-"} />
                          <InfoRow label="Phone" value={order?.donorPhone || "-"} />
                          <InfoRow
                            label="Address"
                            value={
                              order?.donorAddress
                                ? `${order.donorAddress}${order.donorCity ? `, ${order.donorCity}` : ""}${order.donorPostcode ? ` ${order.donorPostcode}` : ""}${order.donorCountry ? `, ${order.donorCountry}` : ""}`
                                : "-"
                            }
                          />
                          <InfoRow
                            label="Totals"
                            value={
                              order
                                ? `${formatCurrency(order.subtotalPence)} + ${formatCurrency(order.feesPence)} fees = ${formatCurrency(order.totalPence)}`
                                : "-"
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

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Choose a refund type and add a reason for your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Refund Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={refundType === "full" ? "default" : "outline"}
                  onClick={() => setRefundType("full")}
                >
                  Full
                </Button>
                <Button
                  type="button"
                  variant={refundType === "partial" ? "default" : "outline"}
                  onClick={() => setRefundType("partial")}
                >
                  Partial
                </Button>
              </div>
            </div>
            {refundType === "partial" && (
              <div className="space-y-2">
                <Label htmlFor="refundAmount">Refund Amount (GBP)</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="e.g. 10.00"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="refundReason">Reason</Label>
              <Input
                id="refundReason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund"
              />
            </div>
            {refundError && <p className="text-sm text-destructive">{refundError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={refundLoading}>
              {refundLoading ? "Refunding..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
