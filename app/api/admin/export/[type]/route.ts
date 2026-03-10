import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { buildCsv } from "@/lib/csv-export"
import { formatAdminUserName } from "@/lib/utils"

export const dynamic = "force-dynamic"

const VALID_TYPES = ["donations", "recurring", "offline-income", "collections", "donors"] as const

function parseDateRange(request: NextRequest): { from: Date; to: Date } | null {
  const fromStr = request.nextUrl.searchParams.get("from")
  const toStr = request.nextUrl.searchParams.get("to")
  if (!fromStr || !toStr) return null
  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return { from, to }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
  }

  const [user, authError] = await requireAdminAuthSafe()
  if (authError) return authError

  const range = parseDateRange(request)
  if (!range) {
    return NextResponse.json(
      { error: "Query params 'from' and 'to' (ISO dates) are required" },
      { status: 400 }
    )
  }

  const { from, to } = range
  const filename = `${type}-${from.toISOString().slice(0, 10)}--${to.toISOString().slice(0, 10)}.csv`

  try {
    let csv: string
    switch (type) {
      case "donations":
        csv = await exportDonations(from, to)
        break
      case "recurring":
        csv = await exportRecurring(from, to)
        break
      case "offline-income":
        csv = await exportOfflineIncome(from, to)
        break
      case "collections":
        csv = await exportCollections(from, to)
        break
      case "donors":
        csv = await exportDonors(from, to)
        break
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[export]", type, err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    )
  }
}

async function exportDonations(from: Date, to: Date): Promise<string> {
  const rows = await prisma.donation.findMany({
    where: {
      status: { not: "PENDING" },
      completedAt: { gte: from, lte: to },
    },
    orderBy: { completedAt: "asc" },
    include: {
      donor: true,
      appeal: { select: { title: true } },
      product: { select: { name: true } },
      fundraiser: {
        select: {
          fundraiserName: true,
          title: true,
          slug: true,
          waterProjectId: true,
          waterProject: { select: { projectType: true } },
          waterProjectCountry: { select: { country: true } },
        },
      },
    },
  })
  const byTx = new Map<string, (typeof rows)[0]>()
  for (const row of rows) {
    const key =
      row.orderNumber && row.transactionId
        ? `${row.orderNumber}:${row.transactionId}`
        : row.id
    if (!byTx.has(key)) byTx.set(key, row)
  }
  const deduped = Array.from(byTx.values()).map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    giftAidClaimedAt: row.giftAidClaimedAt?.toISOString() ?? null,
    donor: row.donor
      ? {
          ...row.donor,
          createdAt: row.donor.createdAt.toISOString(),
          updatedAt: row.donor.updatedAt.toISOString(),
        }
      : null,
  }))
  return buildCsv(deduped as unknown as Record<string, unknown>[])
}

async function exportRecurring(from: Date, to: Date): Promise<string> {
  const rows = await prisma.recurringDonation.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "asc" },
    include: {
      donor: true,
      appeal: { select: { title: true } },
      product: { select: { name: true } },
    },
  })
  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    nextPaymentDate: r.nextPaymentDate?.toISOString() ?? null,
    lastPaymentDate: r.lastPaymentDate?.toISOString() ?? null,
    scheduleEndDate: r.scheduleEndDate?.toISOString() ?? null,
    donor: r.donor
      ? {
          ...r.donor,
          createdAt: r.donor.createdAt.toISOString(),
          updatedAt: r.donor.updatedAt.toISOString(),
        }
      : null,
  }))
  return buildCsv(serialized as unknown as Record<string, unknown>[])
}

async function exportOfflineIncome(from: Date, to: Date): Promise<string> {
  const [income, fundraiserCash, water, sponsorship] = await Promise.all([
    prisma.offlineIncome.findMany({
      where: { receivedAt: { gte: from, lte: to } },
      orderBy: { receivedAt: "asc" },
      include: {
        appeal: { select: { title: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
        donor: true,
      },
    }),
    prisma.fundraiserCashDonation.findMany({
      where: {
        status: "APPROVED",
        receivedAt: { gte: from, lte: to },
      },
      orderBy: { receivedAt: "asc" },
      include: {
        fundraiser: {
          select: {
            title: true,
            fundraiserName: true,
            appeal: { select: { title: true } },
            waterProject: { select: { projectType: true } },
          },
        },
        reviewedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.waterProjectDonation.findMany({
      where: {
        collectedVia: "office",
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: "asc" },
      include: {
        waterProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.sponsorshipDonation.findMany({
      where: {
        collectedVia: "office",
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: "asc" },
      include: {
        sponsorshipProject: { select: { projectType: true, location: true } },
        country: { select: { country: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
  ])

  const incomeRows = income.map((item) => ({
    source: "offline_income",
    id: item.id,
    amountPence: item.amountPence,
    donationType: item.donationType,
    sourceMethod: item.source,
    receivedAt: item.receivedAt.toISOString(),
    donationNumber: item.donationNumber,
    notes: item.notes,
    giftAid: item.giftAid,
    giftAidClaimed: item.giftAidClaimed,
    giftAidClaimedAt: item.giftAidClaimedAt?.toISOString() ?? null,
    appealTitle: item.appeal?.title ?? null,
    addedByName: formatAdminUserName(item.addedBy),
    createdAt: item.createdAt.toISOString(),
    donor: item.donor
      ? {
          ...item.donor,
          createdAt: item.donor.createdAt.toISOString(),
          updatedAt: item.donor.updatedAt.toISOString(),
        }
      : null,
  }))

  const cashRows = fundraiserCash.map((d) => ({
    source: "fundraiser_cash",
    id: d.id,
    amountPence: d.amountPence,
    donationType: d.donationType,
    sourceMethod: d.paymentMethod,
    receivedAt: d.receivedAt.toISOString(),
    donationNumber: d.donationNumber,
    notes: d.notes,
    donorName: d.donorName,
    donorEmail: d.donorEmail,
    donorPhone: d.donorPhone,
    campaignTitle: d.fundraiser?.title ?? d.fundraiser?.fundraiserName ?? null,
    appealTitle: d.fundraiser?.appeal?.title ?? null,
    addedByName: formatAdminUserName(d.reviewedBy),
    createdAt: d.createdAt.toISOString(),
  }))

  const waterRows = water.map((d) => ({
    source: "water",
    id: d.id,
    amountPence: d.amountPence,
    donationType: d.donationType,
    sourceMethod: d.paymentMethod,
    receivedAt: d.createdAt.toISOString(),
    donationNumber: d.donationNumber,
    notes: d.notes,
    projectType: d.waterProject?.projectType ?? null,
    country: d.country?.country ?? null,
    addedByName: formatAdminUserName(d.addedBy),
    createdAt: d.createdAt.toISOString(),
  }))

  const sponsorshipRows = sponsorship.map((d) => ({
    source: "sponsorship",
    id: d.id,
    amountPence: d.amountPence,
    donationType: d.donationType,
    sourceMethod: d.paymentMethod,
    receivedAt: d.createdAt.toISOString(),
    donationNumber: d.donationNumber,
    notes: d.notes,
    projectType: d.sponsorshipProject?.projectType ?? null,
    country: d.country?.country ?? null,
    addedByName: formatAdminUserName(d.addedBy),
    createdAt: d.createdAt.toISOString(),
  }))

  const combined = [
    ...incomeRows,
    ...cashRows,
    ...waterRows,
    ...sponsorshipRows,
  ].sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())

  return buildCsv(combined as unknown as Record<string, unknown>[])
}

async function exportCollections(from: Date, to: Date): Promise<string> {
  const rows = await prisma.collection.findMany({
    where: { collectedAt: { gte: from, lte: to } },
    orderBy: { collectedAt: "asc" },
    include: {
      masjid: { select: { name: true, email: true, emailAlt: true } },
      appeal: { select: { title: true } },
      addedBy: { select: { email: true, firstName: true, lastName: true } },
    },
  })
  const serialized = rows.map((r) => ({
    ...r,
    collectedAt: r.collectedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    addedByName: formatAdminUserName(r.addedBy),
  }))
  return buildCsv(serialized as unknown as Record<string, unknown>[])
}

async function exportDonors(from: Date, to: Date): Promise<string> {
  const rows = await prisma.donor.findMany({
    where: { createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: "asc" },
    include: {
      donations: {
        select: {
          id: true,
          amountPence: true,
          donationType: true,
          frequency: true,
          status: true,
          paymentMethod: true,
          orderNumber: true,
          giftAid: true,
          createdAt: true,
          completedAt: true,
          appeal: { select: { title: true } },
          product: { select: { name: true } },
          fundraiser: { select: { fundraiserName: true, title: true } },
        },
      },
      recurringDonations: {
        select: {
          id: true,
          amountPence: true,
          donationType: true,
          frequency: true,
          status: true,
          paymentMethod: true,
          nextPaymentDate: true,
          lastPaymentDate: true,
          createdAt: true,
          appeal: { select: { title: true } },
          product: { select: { name: true } },
        },
      },
      waterProjectDonations: {
        select: {
          id: true,
          amountPence: true,
          donationType: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          completedAt: true,
          waterProject: { select: { projectType: true } },
          country: { select: { country: true } },
        },
      },
      sponsorshipDonations: {
        select: {
          id: true,
          amountPence: true,
          donationType: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          completedAt: true,
          sponsorshipProject: { select: { projectType: true } },
          country: { select: { country: true } },
        },
      },
    },
  })
  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    donations: r.donations.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      completedAt: d.completedAt?.toISOString() ?? null,
    })),
    recurringDonations: r.recurringDonations.map((rd) => ({
      ...rd,
      createdAt: rd.createdAt.toISOString(),
      nextPaymentDate: rd.nextPaymentDate?.toISOString() ?? null,
      lastPaymentDate: rd.lastPaymentDate?.toISOString() ?? null,
    })),
    waterProjectDonations: r.waterProjectDonations.map((w) => ({
      ...w,
      createdAt: w.createdAt.toISOString(),
      completedAt: w.completedAt?.toISOString() ?? null,
    })),
    sponsorshipDonations: r.sponsorshipDonations.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
    })),
  }))
  return buildCsv(serialized as unknown as Record<string, unknown>[])
}
