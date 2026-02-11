"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { IconCheck, IconX, IconCircleCheckFilled, IconLoader } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime, formatDonorName, formatPaymentMethod, displayDonorEmail } from "@/lib/utils"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

interface Donation {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  paymentMethod: string
  giftAid: boolean
  transactionId: string | null
  createdAt: string
  completedAt: string | null
  donor: {
    title?: string | null
    firstName: string
    lastName: string
    email: string
  }
  isAnonymous?: boolean | null
  appeal?: {
    title: string
  } | null
  product?: {
    name: string
  } | null
}

interface FundraiserDonationsViewProps {
  fundraiserId: string | null
  fundraiserTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FundraiserDonationsView({
  fundraiserId,
  fundraiserTitle,
  open,
  onOpenChange,
}: FundraiserDonationsViewProps) {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && fundraiserId) {
      fetchDonations()
    } else {
      setDonations([])
      setError(null)
    }
  }, [open, fundraiserId])

  const fetchDonations = async () => {
    if (!fundraiserId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/fundraisers/${fundraiserId}/donations`)
      if (!response.ok) {
        throw new Error("Failed to fetch donations")
      }
      const data = await response.json()
      setDonations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load donations")
      console.error("Error fetching donations:", err)
    } finally {
      setLoading(false)
    }
  }

  const totalRaised = donations
    .filter((d) => d.status === "COMPLETED")
    .reduce((sum, d) => sum + d.amountPence, 0)

  const completedCount = donations.filter((d) => d.status === "COMPLETED").length

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Donations for {fundraiserTitle}</SheetTitle>
          <SheetDescription>
            View all donations made to this fundraiser
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-6 p-4 border border-destructive rounded-md bg-destructive/10">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="overflow-y-auto h-[calc(100vh-120px)] mt-6 pr-2">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Raised</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalRaised)}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Donations</p>
                <p className="text-2xl font-bold mt-1">{completedCount}</p>
              </div>
            </div>

            {donations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No donations yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Donations will appear here once supporters start contributing
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">
                            {formatCurrency(donation.amountPence)}
                          </p>
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
                        </div>
                        <p className="text-sm font-medium">
                          {donation.isAnonymous ? "Anonymous" : formatDonorName(donation.donor)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {donation.isAnonymous ? "Anonymous" : displayDonorEmail(donation.donor.email)}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Date
                        </p>
                        <p className="font-medium">
                          {formatDate(
                            donation.completedAt
                              ? new Date(donation.completedAt)
                              : new Date(donation.createdAt)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Payment Method
                        </p>
                        <p className="font-medium">{formatPaymentMethod(donation.paymentMethod)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Donation Type
                        </p>
                        <p className="font-medium">{formatEnum(donation.donationType)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Frequency
                        </p>
                        <p className="font-medium">{formatEnum(donation.frequency)}</p>
                      </div>
                      {donation.product && (
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Product
                          </p>
                          <p className="font-medium">{donation.product.name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Gift Aid
                        </p>
                        <div className="flex items-center gap-1">
                          {donation.giftAid ? (
                            <>
                              <IconCheck className="h-4 w-4 text-primary" />
                              <span className="font-medium">Yes</span>
                            </>
                          ) : (
                            <>
                              <IconX className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">No</span>
                            </>
                          )}
                        </div>
                      </div>
                      {donation.transactionId && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Transaction ID
                          </p>
                          <p className="font-mono text-xs">{donation.transactionId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
