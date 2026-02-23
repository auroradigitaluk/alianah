"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DailyGivingSetupModal, type AppealOption } from "@/components/daily-giving-setup-modal"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatCurrency,
  formatDate,
  formatDonorName,
  formatEnum,
  displayDonorEmail,
} from "@/lib/utils"
import { User, Wallet, ExternalLink, Settings, RefreshCw, Loader2 } from "lucide-react"
import { IconX, IconLoader } from "@tabler/icons-react"
import { toast } from "sonner"

export type DailyGivingSubscription = {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  subscriptionId?: string | null
  nextPaymentDate?: string | Date | null
  lastPaymentDate?: string | Date | null
  scheduleEndDate?: string | Date | null
  createdAt: string
  donor: { title?: string | null; firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
}

interface LiveStripeDetails {
  status: string
  nextPaymentDate: string | null
  cancelAtPeriodEnd: boolean
  cancelAt: string | null
}

function stripeStatusDisplay(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    canceled: "Cancelled",
    cancelled: "Cancelled",
    past_due: "Past due",
    unpaid: "Unpaid",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    trialing: "Trialing",
    paused: "Paused",
  }
  return map[status?.toLowerCase()] ?? status
}

type DailyGivingTabClientProps = {
  appeals: AppealOption[]
  dailyGivingSubscriptions: DailyGivingSubscription[]
}

export function DailyGivingTabClient({
  appeals,
  dailyGivingSubscriptions: initialSubscriptions,
}: DailyGivingTabClientProps) {
  const [setupOpen, setSetupOpen] = React.useState(false)
  const [summary, setSummary] = React.useState<{ appealCount?: number } | null>(null)
  const [subscriptions, setSubscriptions] = React.useState<DailyGivingSubscription[]>(initialSubscriptions)
  const [selected, setSelected] = React.useState<DailyGivingSubscription | null>(null)
  const [liveStripeDetails, setLiveStripeDetails] = React.useState<LiveStripeDetails | null>(null)
  const [liveDetailsLoading, setLiveDetailsLoading] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    setSubscriptions(initialSubscriptions)
  }, [initialSubscriptions])

  const loadSummary = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/daily-giving")
      if (!res.ok) return
      const data = await res.json()
      const ids = Array.isArray(data.dailyGivingAppealIds) ? data.dailyGivingAppealIds : []
      setSummary({ appealCount: ids.length })
    } catch {
      setSummary(null)
    }
  }, [])

  React.useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const fetchLiveStripeDetails = React.useCallback(async (id: string) => {
    setLiveDetailsLoading(true)
    setLiveStripeDetails(null)
    try {
      const res = await fetch(`/api/admin/recurring/${id}/stripe-details`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setLiveStripeDetails({
          status: data.status ?? "",
          nextPaymentDate: data.nextPaymentDate ?? null,
          cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
          cancelAt: data.cancelAt ?? null,
        })
      }
    } catch {
      setLiveStripeDetails(null)
    } finally {
      setLiveDetailsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (selected?.subscriptionId && selected.id) {
      fetchLiveStripeDetails(selected.id)
    } else {
      setLiveStripeDetails(null)
    }
  }, [selected?.id, selected?.subscriptionId, fetchLiveStripeDetails])

  const displayStatus = liveStripeDetails?.status
    ? stripeStatusDisplay(liveStripeDetails.status)
    : selected?.status
      ? formatEnum(selected.status)
      : "-"
  const displayNextPayment =
    liveStripeDetails?.nextPaymentDate ?? selected?.nextPaymentDate ?? null
  const isActiveForCancel =
    liveStripeDetails?.status === "active" || (!liveStripeDetails && selected?.status === "ACTIVE")

  const cancelSubscription = async () => {
    if (!selected?.id) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/recurring/${selected.id}/cancel`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to cancel subscription")
      toast.success("Subscription cancelled")
      setSelected(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel subscription")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Daily giving (Ramadhan)</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Supporters who set up daily giving.
          </p>
          {summary != null && summary.appealCount != null && (
            <p className="text-xs text-muted-foreground mt-2">
              {summary.appealCount === 0
                ? "No appeals selected for the Daily Giving page. Click Setup to configure."
                : `${summary.appealCount} appeal${summary.appealCount === 1 ? "" : "s"} selected for the Daily Giving page.`}
            </p>
          )}
        </div>
        <div className="flex flex-nowrap items-end gap-2 shrink-0">
          <Button variant="outline" size="default" asChild>
            <Link href="/daily" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Open page
            </Link>
          </Button>
          <Button variant="default" size="default" onClick={() => setSetupOpen(true)}>
            <Settings className="size-4" />
            Setup
          </Button>
        </div>
      </div>

      <DailyGivingSetupModal
        open={setupOpen}
        onOpenChange={setSetupOpen}
        appeals={appeals}
        onSaved={loadSummary}
      />

      <div className="mt-6">
        <AdminTable
          data={subscriptions}
          onRowClick={(item) => setSelected(item)}
          columns={[
            {
              id: "donor",
              header: "Donor",
              cell: (item) => (
                <div className="font-medium">{formatDonorName(item.donor)}</div>
              ),
            },
            {
              id: "appeal",
              header: "Appeal",
              cell: (item) => (
                <div className="text-sm">{item.appeal?.title || "General"}</div>
              ),
            },
            {
              id: "amount",
              header: "Amount",
              cell: (item) => (
                <div className="font-medium">
                  {formatCurrency(item.amountPence)} / day
                </div>
              ),
            },
            {
              id: "status",
              header: "Status",
              cell: (item) => {
                if (item.status === "ACTIVE") return <StatusBadge isActive={true} />
                if (item.status === "CANCELLED" || item.status === "FAILED") {
                  return (
                    <Badge variant="outline" className="px-1.5 bg-red-500 text-white border-red-500">
                      <IconX className="mr-1 size-3" />
                      {formatEnum(item.status)}
                    </Badge>
                  )
                }
                return (
                  <Badge variant="outline" className="px-1.5 text-muted-foreground bg-muted">
                    <IconLoader className="mr-1 size-3" />
                    {formatEnum(item.status)}
                  </Badge>
                )
              },
            },
            {
              id: "nextPayment",
              header: "Next payment",
              cell: (item) => (
                <div className="text-sm">{formatDate(item.nextPaymentDate)}</div>
              ),
            },
            {
              id: "endDate",
              header: "Ends",
              cell: (item) => (
                <div className="text-sm">{formatDate(item.scheduleEndDate)}</div>
              ),
            },
          ]}
          enableSelection={false}
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold">Daily giving details</DialogTitle>
                <DialogDescription>
                  {selected &&
                    `${formatCurrency(selected.amountPence)} / day • ${formatDonorName(selected.donor)}`}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {selected?.subscriptionId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => selected.id && fetchLiveStripeDetails(selected.id)}
                    disabled={liveDetailsLoading}
                    title="Refresh live data from Stripe"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${liveDetailsLoading ? "animate-spin" : ""}`}
                    />
                  </Button>
                )}
                {isActiveForCancel && selected?.subscriptionId && (
                  <Button
                    variant="destructive"
                    onClick={cancelSubscription}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Cancelling…" : "Cancel subscription"}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {selected && (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  Subscription
                </div>
                <div className="rounded-lg border border-border/60 px-4 py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{formatCurrency(selected.amountPence)} per day</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Donation type</span>
                    <span>{formatEnum(selected.donationType)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Appeal</span>
                    <span>{selected.appeal?.title || "General"}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">
                      Status
                      {liveStripeDetails && (
                        <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
                          (live)
                        </span>
                      )}
                    </span>
                    <span>
                      {liveDetailsLoading ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading…
                        </span>
                      ) : displayStatus === "Active" ? (
                        <StatusBadge isActive={true} />
                      ) : displayStatus === "Cancelled" || displayStatus === "Expired" ? (
                        <Badge
                          variant="outline"
                          className="px-1.5 bg-red-500 text-white border-red-500"
                        >
                          {displayStatus}
                        </Badge>
                      ) : (
                        displayStatus
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Next payment
                      {liveStripeDetails?.nextPaymentDate && (
                        <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">
                          (live)
                        </span>
                      )}
                    </span>
                    <span>
                      {liveDetailsLoading ? "Loading…" : formatDate(displayNextPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last payment</span>
                    <span>{formatDate(selected.lastPaymentDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Charges until</span>
                    <span>{formatDate(selected.scheduleEndDate)}</span>
                  </div>
                  {liveStripeDetails?.cancelAtPeriodEnd && liveStripeDetails?.cancelAt && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                      Cancels at period end: {formatDate(liveStripeDetails.cancelAt)}
                    </div>
                  )}
                  {selected.subscriptionId && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Stripe: <span className="font-mono">{selected.subscriptionId}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <User className="h-4 w-4" />
                  Donor
                </div>
                <div className="rounded-lg border border-border/60 px-4 py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span>{formatDonorName(selected.donor)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="break-all">{displayDonorEmail(selected.donor.email)}</span>
                  </div>
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
