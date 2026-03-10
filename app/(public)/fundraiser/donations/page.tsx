import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { FundraiserDonationsClient } from "@/components/fundraiser-donations-client"

export const dynamic = "force-dynamic"

export type FundraiserDonationRow = {
  id: string
  amountPence: number
  donorDisplay: string
  fundraiserTitle: string
  fundraiserId: string | null
  source: "online" | "offline"
  status: string
  date: Date
  orderNumber?: string | null
  donationNumber?: string | null
}

async function getDonationsForFundraisers(email: string): Promise<{
  rows: FundraiserDonationRow[]
  fundraisers: { id: string; title: string }[]
}> {
  const fundraisers = await prisma.fundraiser.findMany({
    where: { email },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  })
  const fundraiserIds = fundraisers.map((f) => f.id)
  if (fundraiserIds.length === 0) {
    return { rows: [], fundraisers: [] }
  }

  const [onlineDonations, cashDonations] = await Promise.all([
    prisma.donation.findMany({
      where: {
        fundraiserId: { in: fundraiserIds },
        status: { not: "PENDING" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        donor: { select: { title: true, firstName: true, lastName: true } },
        fundraiser: { select: { title: true } },
      },
    }),
    prisma.fundraiserCashDonation.findMany({
      where: { fundraiserId: { in: fundraiserIds } },
      orderBy: { createdAt: "desc" },
      include: {
        fundraiser: { select: { title: true } },
      },
    }),
  ])

  const idToTitle = Object.fromEntries(fundraisers.map((f) => [f.id, f.title]))

  const onlineRows: FundraiserDonationRow[] = onlineDonations.map((d) => ({
    id: d.id,
    amountPence: d.amountPence,
    donorDisplay:
      [d.donor.title, d.donor.firstName, d.donor.lastName].filter(Boolean).join(" ") ||
      "Anonymous",
    fundraiserTitle: d.fundraiser?.title ?? idToTitle[d.fundraiserId ?? ""] ?? "—",
    fundraiserId: d.fundraiserId,
    source: "online",
    status: d.status,
    date: d.completedAt ?? d.createdAt,
    orderNumber: d.orderNumber,
  }))

  const offlineRows: FundraiserDonationRow[] = cashDonations.map((d) => ({
    id: d.id,
    amountPence: d.amountPence,
    donorDisplay: d.donorName?.trim() || "—",
    fundraiserTitle: d.fundraiser?.title ?? idToTitle[d.fundraiserId ?? ""] ?? "—",
    fundraiserId: d.fundraiserId,
    source: "offline",
    status: d.status,
    date: d.receivedAt ?? d.createdAt,
    donationNumber: d.donationNumber,
  }))

  const rows = [...onlineRows, ...offlineRows].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return {
    rows,
    fundraisers: fundraisers.map((f) => ({ id: f.id, title: f.title })),
  }
}

export default async function FundraiserDonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ fundraiserId?: string }>
}) {
  const email = await getFundraiserEmail()

  if (!email) {
    redirect("/fundraiser/login?redirect=/fundraiser/donations")
  }

  const params = await searchParams
  const initialFundraiserId = params.fundraiserId ?? null

  const { rows, fundraisers } = await getDonationsForFundraisers(email)

  return (
    <FundraiserDonationsClient
      donations={rows}
      fundraisers={fundraisers}
      initialFundraiserId={initialFundraiserId}
    />
  )
}
