import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/admin-auth"
import { isValidPhone, isPlaceholderDonorEmail } from "@/lib/utils"
import { generateDonationNumber } from "@/lib/donation-number"
import {
  sendOfflineDonationReceiptEmail,
  sendWaterProjectDonationEmail,
  sendSponsorshipDonationEmail,
} from "@/lib/email"

const donorPhoneRefine = (v: string | undefined) => !v || isValidPhone(v)

const baseSchema = z.object({
  type: z.enum(["appeal", "water", "sponsorship"]),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
  source: z.enum(["CASH", "OFFICE_BUCKETS", "CARD_SUMUP", "BANK_TRANSFER"]),
  collectedVia: z.string().optional().default("office"),
  receivedAt: z.string(),
  notes: z.string().nullable().optional(),
  sendReceiptEmail: z.boolean().optional().default(false),
})

const appealSchema = baseSchema.extend({
  type: z.literal("appeal"),
  appealId: z.string().min(1),
  amountPence: z.number().int().positive(),
  giftAid: z.boolean().optional().default(false),
  donor: z
    .object({
      title: z.string().nullable().optional(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().refine(donorPhoneRefine, "Invalid phone number"),
      address: z.string().optional(),
      city: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
})

const waterSchema = baseSchema.extend({
  type: z.literal("water"),
  projectType: z.enum(["WATER_PUMP", "WATER_WELL", "WATER_TANK", "WUDHU_AREA"]),
  waterProjectId: z.string().min(1),
  waterProjectCountryId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
  plaqueName: z.string().min(1, "Plaque name is required for water project donations"),
  donor: z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().refine(donorPhoneRefine, "Invalid phone number"),
    })
    .optional(),
})

const sponsorshipSchema = baseSchema.extend({
  type: z.literal("sponsorship"),
  projectType: z.enum(["ORPHANS", "HIFZ", "FAMILIES"]),
  sponsorshipProjectId: z.string().min(1),
  sponsorshipCountryId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
  donor: z
    .object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional().refine(donorPhoneRefine, "Invalid phone number"),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  let adminUser: { id: string }
  try {
    adminUser = await requireAdminRole(["ADMIN", "STAFF"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const body = await request.json()
    const makeFallbackEmail = () =>
      `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@alianahapp.local`
    if (body?.type === "appeal") {
      const data = appealSchema.parse(body)
      const receivedAt = new Date(data.receivedAt)
      const giftAid = !!data.giftAid
      const donorInput = data.donor

      let donorId: string | null = null
      let billingAddress: string | null = null
      let billingCity: string | null = null
      let billingPostcode: string | null = null
      let billingCountry: string | null = null

      if ((giftAid || data.sendReceiptEmail) && donorInput) {
        const emailProvided = donorInput.email?.trim()
        const firstProvided = donorInput.firstName?.trim()
        const lastProvided = donorInput.lastName?.trim()
        if (data.sendReceiptEmail) {
          if (!emailProvided) {
            return NextResponse.json(
              { error: "Email is required to send receipt" },
              { status: 400 }
            )
          }
          if (!firstProvided || !lastProvided) {
            return NextResponse.json(
              { error: "First name and last name are required to send receipt" },
              { status: 400 }
            )
          }
        }
        const email = emailProvided || makeFallbackEmail()
        const firstName = firstProvided || "Anonymous"
        const lastName = lastProvided || "Donor"
        const donor = await prisma.donor.upsert({
          where: { email: email.toLowerCase() },
          update: {
            title: donorInput.title || null,
            firstName,
            lastName,
            phone: donorInput.phone?.trim() || null,
            address: donorInput.address?.trim() || null,
            city: donorInput.city?.trim() || null,
            postcode: donorInput.postcode?.trim() || null,
            country: donorInput.country?.trim() || null,
          },
          create: {
            email: email.toLowerCase(),
            title: donorInput.title || null,
            firstName,
            lastName,
            phone: donorInput.phone?.trim() || null,
            address: donorInput.address?.trim() || null,
            city: donorInput.city?.trim() || null,
            postcode: donorInput.postcode?.trim() || null,
            country: donorInput.country?.trim() || null,
          },
        })
        donorId = donor.id
        billingAddress = donorInput.address?.trim() || donor.address || null
        billingCity = donorInput.city?.trim() || donor.city || null
        billingPostcode = donorInput.postcode?.trim() || donor.postcode || null
        billingCountry = donorInput.country?.trim() || donor.country || null
      }
      if (data.sendReceiptEmail && !donorId) {
        return NextResponse.json(
          { error: "Email is required to send receipt" },
          { status: 400 }
        )
      }

      const donationNumber = await generateDonationNumber()
      const income = await prisma.offlineIncome.create({
        data: {
          appealId: data.appealId,
          donorId,
          amountPence: data.amountPence,
          donationType: data.donationType,
          source: data.source,
          collectedVia: data.collectedVia || "office",
          receivedAt,
          notes: data.notes || null,
          addedByAdminUserId: adminUser.id,
          giftAid,
          billingAddress,
          billingCity,
          billingPostcode,
          billingCountry,
          donationNumber,
        },
        include: { donor: true, appeal: { select: { title: true } } },
      })

      if (
        data.sendReceiptEmail &&
        income.donor &&
        income.appeal &&
        !isPlaceholderDonorEmail(income.donor.email)
      ) {
        try {
          await sendOfflineDonationReceiptEmail({
            donorEmail: income.donor.email,
            donorName: [income.donor.firstName, income.donor.lastName].filter(Boolean).join(" ") || "Donor",
            appealTitle: income.appeal.title,
            amountPence: data.amountPence,
            donationType: data.donationType,
            receivedAt,
            donationNumber: income.donationNumber ?? donationNumber,
          })
        } catch (err) {
          console.error("Failed to send offline donation receipt:", err)
          return NextResponse.json(
            { error: "Entry saved but receipt email failed to send" },
            { status: 500 }
          )
        }
      }

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
      if (data.sendReceiptEmail) {
        if (!donorInput?.email?.trim() || isPlaceholderDonorEmail(donorInput.email.trim())) {
          return NextResponse.json(
            { error: "Valid email is required to send receipt" },
            { status: 400 }
          )
        }
        if (!donorInput?.firstName?.trim() || !donorInput?.lastName?.trim()) {
          return NextResponse.json(
            { error: "First name and last name are required to send receipt" },
            { status: 400 }
          )
        }
      }
      const donorEmail = donorInput?.email?.trim() || makeFallbackEmail()
      const donorFirst = donorInput?.firstName?.trim() || "Anonymous"
      const donorLast = donorInput?.lastName?.trim() || "Donor"
      const donorPhone = donorInput?.phone?.trim() || null
      const donor = await prisma.donor.upsert({
        where: { email: donorEmail },
        update: {
          firstName: donorFirst,
          lastName: donorLast,
          phone: donorPhone,
        },
        create: {
          firstName: donorFirst,
          lastName: donorLast,
          email: donorEmail,
          phone: donorPhone,
        },
      })

      const qty = data.quantity ?? 1
      const donationNumbers = await Promise.all(
        Array.from({ length: qty }, () => generateDonationNumber())
      )
      const created: { id: string }[] = []
      for (let i = 0; i < qty; i++) {
        const donation = await prisma.sponsorshipDonation.create({
          data: {
            sponsorshipProjectId: project.id,
            countryId: country.id,
            countryName: country.country,
            projectTypeSnapshot: project.projectType,
            donorId: donor.id,
            amountPence: country.yearlyPricePence!,
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
            addedByAdminUserId: adminUser.id,
            donationNumber: donationNumbers[i],
          },
        })
        created.push({ id: donation.id })
      }

      if (!project.status) {
        await prisma.sponsorshipProject.update({
          where: { id: project.id },
          data: { status: "WAITING_TO_REVIEW" },
        })
      }

      if (data.sendReceiptEmail && !isPlaceholderDonorEmail(donor.email)) {
        try {
          const totalPence = country.yearlyPricePence! * qty
          await sendSponsorshipDonationEmail({
            donorEmail: donor.email,
            donorName: [donorFirst, donorLast].filter(Boolean).join(" ") || "Donor",
            projectType: project.projectType,
            location: project.location,
            country: country.country,
            amount: totalPence,
            donationType: data.donationType,
            donationNumber: donationNumbers[0],
            quantity: qty > 1 ? qty : undefined,
            unitAmountPence: qty > 1 ? country.yearlyPricePence! : undefined,
          })
          await prisma.sponsorshipDonation.updateMany({
            where: { id: { in: created.map((c) => c.id) } },
            data: { emailSent: true },
          })
        } catch (err) {
          console.error("Failed to send sponsorship receipt:", err)
          return NextResponse.json(
            { error: "Donation saved but receipt email failed to send" },
            { status: 500 }
          )
        }
      }

      return NextResponse.json({
        success: true,
        donationId: created[0].id,
        count: created.length,
      })
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
      if (data.sendReceiptEmail) {
        if (!donorInput?.email?.trim() || isPlaceholderDonorEmail(donorInput.email.trim())) {
          return NextResponse.json(
            { error: "Valid email is required to send receipt" },
            { status: 400 }
          )
        }
        if (!donorInput?.firstName?.trim() || !donorInput?.lastName?.trim()) {
          return NextResponse.json(
            { error: "First name and last name are required to send receipt" },
            { status: 400 }
          )
        }
      }
      const donorEmail = donorInput?.email?.trim() || makeFallbackEmail()
      const donorFirst = donorInput?.firstName?.trim() || "Anonymous"
      const donorLast = donorInput?.lastName?.trim() || "Donor"
      const donorPhone = donorInput?.phone?.trim() || null
      const donor = await prisma.donor.upsert({
        where: { email: donorEmail },
        update: {
          firstName: donorFirst,
          lastName: donorLast,
          phone: donorPhone,
        },
        create: {
          firstName: donorFirst,
          lastName: donorLast,
          email: donorEmail,
          phone: donorPhone,
        },
      })

    const qty = data.quantity ?? 1
    const waterDonationNumbers = await Promise.all(
      Array.from({ length: qty }, () => generateDonationNumber())
    )
    const created: { id: string }[] = []
    for (let i = 0; i < qty; i++) {
      const donation = await prisma.waterProjectDonation.create({
        data: {
          waterProjectId: project.id,
          countryId: country.id,
          countryName: country.country,
          projectTypeSnapshot: project.projectType,
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
          plaqueName: data.plaqueName || null,
          addedByAdminUserId: adminUser.id,
          donationNumber: waterDonationNumbers[i],
        },
      })
      created.push({ id: donation.id })
    }

    if (!project.status) {
      await prisma.waterProject.update({
        where: { id: project.id },
        data: { status: "WAITING_TO_REVIEW" },
      })
    }

    if (data.sendReceiptEmail && !isPlaceholderDonorEmail(donor.email)) {
      try {
        const totalPence = country.pricePence * qty
        await sendWaterProjectDonationEmail({
          donorEmail: donor.email,
          donorName: [donorFirst, donorLast].filter(Boolean).join(" ") || "Donor",
          projectType: project.projectType,
          location: project.location,
          country: country.country,
          amount: totalPence,
          donationType: data.donationType,
          donationNumber: waterDonationNumbers[0],
          quantity: qty > 1 ? qty : undefined,
          unitAmountPence: qty > 1 ? country.pricePence : undefined,
        })
        await prisma.waterProjectDonation.updateMany({
          where: { id: { in: created.map((c) => c.id) } },
          data: { emailSent: true },
        })
      } catch (err) {
        console.error("Failed to send water project receipt:", err)
        return NextResponse.json(
          { error: "Donation saved but receipt email failed to send" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      donationId: created[0].id,
      count: created.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0]
      const msg = first ? `${first.path.join(".")}: ${first.message}` : "Invalid request"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error("Offline income error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
