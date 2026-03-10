"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrencyWhole } from "@/lib/utils"
import { Smile } from "lucide-react"

const AVATAR_COLORS = [
  "bg-blue-200 text-blue-800",
  "bg-pink-200 text-pink-800",
  "bg-violet-200 text-violet-800",
  "bg-teal-200 text-teal-800",
  "bg-amber-200 text-amber-800",
]

const POLL_INTERVAL_MS = 30_000

export type RecentDonationInput = {
  amountPence: number
  donor: {
    firstName: string | null
    lastName?: string | null
  }
  isAnonymous?: boolean | null
  timeAgo: string
}

type RecentDonationFromApi = {
  id: string
  amountPence: number
  donor: { firstName: string | null; lastName?: string | null }
  isAnonymous?: boolean | null
  createdAt: string
}

type DisplayDonation = {
  id: string
  amountPence: number
  donor: { firstName: string | null; lastName?: string | null }
  isAnonymous?: boolean | null
  timeAgo: string
}

function formatTimeAgo(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return "just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return `${Math.floor(diffInSeconds / 604800)}w ago`
}

function toDisplay(d: RecentDonationFromApi): DisplayDonation {
  return {
    id: d.id,
    amountPence: d.amountPence,
    donor: d.donor,
    isAnonymous: d.isAnonymous,
    timeAgo: formatTimeAgo(d.createdAt),
  }
}

export function FundraiserRecentDonations({
  donations: initialDonations,
  fundraiserId,
}: {
  donations: RecentDonationInput[]
  fundraiserId?: string
}) {
  const [donations, setDonations] = React.useState<DisplayDonation[]>(() =>
    initialDonations.map((d, i) => ({
      id: `initial-${i}`,
      amountPence: d.amountPence,
      donor: d.donor,
      isAnonymous: d.isAnonymous,
      timeAgo: d.timeAgo,
    }))
  )

  React.useEffect(() => {
    if (!fundraiserId) return

    const fetchRecent = async () => {
      try {
        const res = await fetch(`/api/fundraisers/${fundraiserId}/recent-donations`)
        if (!res.ok) return
        const data: RecentDonationFromApi[] = await res.json()
        setDonations(data.map(toDisplay))
      } catch {
        // keep existing data on error
      }
    }

    fetchRecent()
    const interval = setInterval(fetchRecent, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fundraiserId])

  if (donations.length === 0) return null

  return (
    <Card className="border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm rounded-xl overflow-hidden">
      <CardContent className="px-5 sm:px-6 pt-2.5 pb-2.5 sm:pt-3 sm:pb-3 space-y-4">
        <h3 className="font-bold text-neutral-900 dark:text-foreground text-base">Recent supporters</h3>
        <div
          className="space-y-4 overflow-y-auto overscroll-contain pr-1 -mr-1"
          style={{ maxHeight: "min(400px, 60vh)" }}
          aria-label="Recent supporters list"
        >
          {donations.map((donation, index) => {
            const displayName = donation.isAnonymous
              ? "Anonymous Kind Soul"
              : [donation.donor.firstName, donation.donor.lastName]
                  .filter(Boolean)
                  .join(" ") || "Anonymous Kind Soul"
            const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
            return (
              <div key={donation.id} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${avatarColor}`}
                  aria-hidden
                >
                  <Smile className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 dark:text-foreground truncate">{displayName}</p>
                  <p className="text-sm text-neutral-500 dark:text-muted-foreground">
                    {formatCurrencyWhole(donation.amountPence)} GBP, {donation.timeAgo}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
