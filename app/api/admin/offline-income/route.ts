import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const baseSchema = z.object({
  type: z.enum(["appeal", "water", "sponsorship"]),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
  source: z.enum(["CASH", "OFFICE_BUCKETS", "CARD_SUMUP", "BANK_TRANSFER"]),
  collectedVia: z.string().optional().default("office"),
  receivedAt: z.string(),
  notes: z.string().nullable().optional(),
})

const appealSchema = baseSchema.extend({
  type: z.literal("appeal"),
  appealId: z.string().min(1),
  amountPence: z.number().int().positive(),
})

const waterSchema = baseSchema.extend({
  type: z.literal("water"),
  projectType: z.enum(["WATER_PUMP", "WATER_WELL", "WATER_TANK", "WUDHU_AREA"]),
  waterProjectId: z.string().min(1),
  waterProjectCountryId: z.string().min(1),
  plaqueName: z.string().nullable().optional(),
  donor: z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
})

const sponsorshipSchema = baseSchema.extend({
  type: z.literal("sponsorship"),
  projectType: z.enum(["ORPHANS", "HIFZ", "FAMILIES"]),
  sponsorshipProjectId: z.string().min(1),
  sponsorshipCountryId: z.string().min(1),
  donor: z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const makeFallbackEmail = () =>
      `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@alianahapp.local`
    if (body?.type === "appeal") {
      const data = appealSchema.parse(body)
      const receivedAt = new Date(data.receivedAt)

      const income = await prisma.offlineIncome.create({
        data: {
          appealId: data.appealId,
          amountPence: data.amountPence,
          donationType: data.donationType,
          source: data.source,
          collectedVia: data.collectedVia || "office",
          receivedAt,
          notes: data.notes || null,
        },
      })

      return NextResponse.json({ success: true, incomeId: income.id })
    }

    if (body?.type === "sponsorship") {
      const data = sponsorshipSchema.parse(body)
      const receivedAt = new Date(data.receivedAt)

      const [project, country] = await Promise.all([
        prisma.sponsorshipProject.findUnique({ where: { id: data.sponsorshipProjectId } }),
        prisma.sponsorshipProjectCountry.findUnique({ where: { id: data.sponsorshipCountryId } }),
      ])

      if (!project || !country) {
        return NextResponse.json({ error: "Sponsorship project not found" }, { status: 404 })
      }
      if (country.projectType !== project.projectType) {
        return NextResponse.json({ error: "Country does not match project type" }, { status: 400 })
      }
      if (!country.yearlyPricePence || country.yearlyPricePence <= 0) {
        return NextResponse.json({ error: "Yearly price not configured for this country" }, { status: 400 })
      }

      const donorInput = data.donor
      const donorEmail = donorInput?.email?.trim() || makeFallbackEmail()
      const donorFirst = donorInput?.firstName?.trim() || "Anonymous"
      const donorLast = donorInput?.lastName?.trim() || "Donor"
      const donor = await prisma.donor.upsert({
        where: { email: donorEmail },
        update: {
          firstName: donorFirst,
          lastName: donorLast,
        },
        create: {
          firstName: donorFirst,
          lastName: donorLast,
          email: donorEmail,
        },
      })

      const donation = await prisma.sponsorshipDonation.create({
        data: {
          sponsorshipProjectId: project.id,
          countryId: country.id,
          donorId: donor.id,
          amountPence: country.yearlyPricePence,
          donationType: data.donationType,
          paymentMethod: data.source,
          collectedVia: data.collectedVia || "office",
          giftAid: false,
          emailSent: false,
          reportSent: false,
          status: "WAITING_TO_REVIEW",
          createdAt: receivedAt,
          notes: ["Yearly sponsorship", data.notes ? `Notes: ${data.notes}` : null]
            .filter(Boolean)
            .join(" | ") || null,
        },
      })

      if (!project.status) {
        await prisma.sponsorshipProject.update({
          where: { id: project.id },
          data: { status: "WAITING_TO_REVIEW" },
        })
      }

      return NextResponse.json({ success: true, donationId: donation.id })
    }

    const data = waterSchema.parse(body)
    const receivedAt = new Date(data.receivedAt)

    const [project, country] = await Promise.all([
      prisma.waterProject.findUnique({ where: { id: data.waterProjectId } }),
      prisma.waterProjectCountry.findUnique({ where: { id: data.waterProjectCountryId } }),
    ])

    if (!project || !country) {
      return NextResponse.json({ error: "Water project not found" }, { status: 404 })
    }
    if (country.projectType !== project.projectType) {
      return NextResponse.json({ error: "Country does not match project type" }, { status: 400 })
    }

      const donorInput = data.donor
      const donorEmail = donorInput?.email?.trim() || makeFallbackEmail()
      const donorFirst = donorInput?.firstName?.trim() || "Anonymous"
      const donorLast = donorInput?.lastName?.trim() || "Donor"
      const donor = await prisma.donor.upsert({
        where: { email: donorEmail },
        update: {
          firstName: donorFirst,
          lastName: donorLast,
        },
        create: {
          firstName: donorFirst,
          lastName: donorLast,
          email: donorEmail,
        },
      })

    const donation = await prisma.waterProjectDonation.create({
      data: {
        waterProjectId: project.id,
        countryId: country.id,
        donorId: donor.id,
        amountPence: country.pricePence,
        donationType: data.donationType,
        paymentMethod: data.source,
        collectedVia: data.collectedVia || "office",
        giftAid: false,
        emailSent: false,
        reportSent: false,
        status: "WAITING_TO_REVIEW",
        createdAt: receivedAt,
        notes: [
          data.plaqueName ? `Plaque Name: ${data.plaqueName}` : null,
          data.notes ? `Notes: ${data.notes}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || null,
      },
    })

    if (!project.status) {
      await prisma.waterProject.update({
        where: { id: project.id },
        data: { status: "WAITING_TO_REVIEW" },
      })
    }

    return NextResponse.json({ success: true, donationId: donation.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Offline income error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
