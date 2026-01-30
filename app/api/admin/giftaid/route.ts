import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { GiftAidScheduleResponse, GiftAidScheduleRow } from "@/lib/giftaid"

const querySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
})

const patchSchema = z.object({
  donorId: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
})

const claimSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
})

const parseDate = (value?: string) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

const defaultDateRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

const buildRows = (rows: Array<{
  id: string
  donorId: string
  amountPence: number
  createdAt: Date
  giftAidClaimed: boolean
  billingAddress: string | null
  billingPostcode: string | null
  donor: {
    title: string | null
    firstName: string
    lastName: string
    address: string | null
    postcode: string | null
    email: string | null
    phone: string | null
  }
}>) => {
  return rows.map<GiftAidScheduleRow>((row) => ({
    id: row.id,
    donorId: row.donorId,
    title: row.donor.title || null,
    firstName: row.donor.firstName || null,
    lastName: row.donor.lastName || null,
    email: row.donor.email || null,
    phone: row.donor.phone || null,
    giftAidClaimed: row.giftAidClaimed,
    houseNumber: row.billingAddress || row.donor.address || null,
    postcode: row.billingPostcode || row.donor.postcode || null,
    aggregated: null,
    sponsored: null,
    donationDate: row.createdAt.toISOString(),
    amountPence: row.amountPence,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const query = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    const start = parseDate(query.start)
    const end = parseDate(query.end)
    const range = start && end ? { start, end } : defaultDateRange()
    const dateFilter = { gte: range.start, lte: range.end }

    const [eligibleDonations, eligibleWater, eligibleSponsorship, nonDonations, nonWater, nonSponsorship] =
      await Promise.all([
        prisma.donation.findMany({
          where: { createdAt: dateFilter, status: "COMPLETED", giftAid: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            donorId: true,
            amountPence: true,
            createdAt: true,
            giftAidClaimed: true,
            billingAddress: true,
            billingPostcode: true,
            donor: {
              select: {
                title: true,
                firstName: true,
                lastName: true,
                address: true,
                postcode: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        prisma.waterProjectDonation.findMany({
          where: { createdAt: dateFilter, status: "COMPLETE", giftAid: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            donorId: true,
            amountPence: true,
            createdAt: true,
            giftAidClaimed: true,
            billingAddress: true,
            billingPostcode: true,
            donor: {
              select: {
                title: true,
                firstName: true,
                lastName: true,
                address: true,
                postcode: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        prisma.sponsorshipDonation.findMany({
          where: { createdAt: dateFilter, status: "COMPLETE", giftAid: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            donorId: true,
            amountPence: true,
            createdAt: true,
            giftAidClaimed: true,
            billingAddress: true,
            billingPostcode: true,
            donor: {
              select: {
                title: true,
                firstName: true,
                lastName: true,
                address: true,
                postcode: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        prisma.donation.findMany({
          where: { createdAt: dateFilter, status: "COMPLETED", giftAid: false },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            donorId: true,
            amountPence: true,
            createdAt: true,
            giftAidClaimed: true,
            billingAddress: true,
            billingPostcode: true,
            donor: {
              select: {
                title: true,
                firstName: true,
                lastName: true,
                address: true,
                postcode: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        prisma.waterProjectDonation.findMany({
          where: { createdAt: dateFilter, status: "COMPLETE", giftAid: false },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            donorId: true,
            amountPence: true,
            createdAt: true,
            giftAidClaimed: true,
            billingAddress: true,
            billingPostcode: true,
            donor: {
              select: {
                title: true,
                firstName: true,
                lastName: true,
                address: true,
                postcode: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        prisma.sponsorshipDonation.findMany({
          where: { createdAt: dateFilter, status: "COMPLETE", giftAid: false },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            donorId: true,
            amountPence: true,
            createdAt: true,
            giftAidClaimed: true,
            billingAddress: true,
            billingPostcode: true,
            donor: {
              select: {
                title: true,
                firstName: true,
                lastName: true,
                address: true,
                postcode: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
      ])

    const eligibleRows = buildRows([
      ...eligibleDonations,
      ...eligibleWater,
      ...eligibleSponsorship,
    ])
    const ineligibleRows = buildRows([
      ...nonDonations,
      ...nonWater,
      ...nonSponsorship,
    ])

    const response: GiftAidScheduleResponse = {
      range: { start: range.start.toISOString(), end: range.end.toISOString() },
      eligible: {
        rows: eligibleRows,
        summary: {
          totalAmountPence: eligibleRows.reduce((sum, row) => sum + row.amountPence, 0),
          totalCount: eligibleRows.length,
        },
      },
      ineligible: {
        rows: ineligibleRows,
        summary: {
          totalAmountPence: ineligibleRows.reduce((sum, row) => sum + row.amountPence, 0),
          totalCount: ineligibleRows.length,
        },
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Gift Aid API error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to build gift aid export"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = patchSchema.parse(await request.json())
    const start = parseDate(body.start)
    const end = parseDate(body.end)
    const range = start && end ? { start, end } : defaultDateRange()
    const dateFilter = { gte: range.start, lte: range.end }

    const [donations, waterDonations, sponsorshipDonations] = await Promise.all([
      prisma.donation.updateMany({
        where: { donorId: body.donorId, createdAt: dateFilter, status: "COMPLETED", giftAid: false },
        data: { giftAid: true },
      }),
      prisma.waterProjectDonation.updateMany({
        where: { donorId: body.donorId, createdAt: dateFilter, status: "COMPLETE", giftAid: false },
        data: { giftAid: true },
      }),
      prisma.sponsorshipDonation.updateMany({
        where: { donorId: body.donorId, createdAt: dateFilter, status: "COMPLETE", giftAid: false },
        data: { giftAid: true },
      }),
    ])

    return NextResponse.json({
      updated: donations.count + waterDonations.count + sponsorshipDonations.count,
    })
  } catch (error) {
    console.error("Gift Aid update error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to update gift aid eligibility"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = claimSchema.parse(await request.json())
    const start = parseDate(body.start)
    const end = parseDate(body.end)
    const range = start && end ? { start, end } : defaultDateRange()
    const dateFilter = { gte: range.start, lte: range.end }

    const [donations, waterDonations, sponsorshipDonations] = await Promise.all([
      prisma.donation.updateMany({
        where: { createdAt: dateFilter, status: "COMPLETED", giftAid: true },
        data: { giftAidClaimed: true },
      }),
      prisma.waterProjectDonation.updateMany({
        where: { createdAt: dateFilter, status: "COMPLETE", giftAid: true },
        data: { giftAidClaimed: true },
      }),
      prisma.sponsorshipDonation.updateMany({
        where: { createdAt: dateFilter, status: "COMPLETE", giftAid: true },
        data: { giftAidClaimed: true },
      }),
    ])

    return NextResponse.json({
      updated: donations.count + waterDonations.count + sponsorshipDonations.count,
    })
  } catch (error) {
    console.error("Gift Aid claim error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to mark gift aid as claimed"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
