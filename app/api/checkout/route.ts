import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { COLLECTION_SOURCES, PAYMENT_METHODS } from "@/lib/utils"
import { sendSponsorshipDonationEmail, sendWaterProjectDonationEmail } from "@/lib/email"
import { z } from "zod"

const itemSchema = z.object({
  appealId: z.string().optional(),
  appealTitle: z.string(),
  fundraiserId: z.string().optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  frequency: z.enum(["ONE_OFF", "MONTHLY", "YEARLY"]),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
  amountPence: z.number().int().positive(),

  // Water project
  waterProjectId: z.string().optional(),
  waterProjectCountryId: z.string().optional(),
  plaqueName: z.string().optional(),

  // Sponsorship
  sponsorshipProjectId: z.string().optional(),
  sponsorshipCountryId: z.string().optional(),
  sponsorshipProjectType: z.string().optional(),
})

const checkoutSchema = z.object({
  items: z.array(itemSchema).min(1),
  donor: z.object({
    title: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    billingAddress: z.string().optional(),
    billingCity: z.string().optional(),
    billingPostcode: z.string().optional(),
    billingCountry: z.string().optional(),
    marketingEmail: z.boolean(),
    marketingSMS: z.boolean(),
    giftAid: z.boolean(),
    coverFees: z.boolean(),
  }),
  subtotalPence: z.number().int().nonnegative(),
  feesPence: z.number().int().nonnegative(),
  totalPence: z.number().int().nonnegative(),
})

function isAppealItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.appealId)
}

function isWaterProjectItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.waterProjectId)
}

function isSponsorshipItem(item: z.infer<typeof itemSchema>) {
  return Boolean(item.sponsorshipProjectId)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = checkoutSchema.parse(body)

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Get or create donor
    let donor = await prisma.donor.findUnique({
      where: { email: validated.donor.email },
    })

    if (!donor) {
      donor = await prisma.donor.create({
        data: {
          title: validated.donor.title || null,
          firstName: validated.donor.firstName,
          lastName: validated.donor.lastName,
          email: validated.donor.email,
          phone: validated.donor.phone || null,
          address: validated.donor.address || null,
          city: validated.donor.city || null,
          postcode: validated.donor.postcode || null,
          country: validated.donor.country || null,
        },
      })
    } else {
      donor = await prisma.donor.update({
        where: { id: donor.id },
        data: {
          title: validated.donor.title || donor.title,
          firstName: validated.donor.firstName,
          lastName: validated.donor.lastName,
          phone: validated.donor.phone || donor.phone,
          address: validated.donor.address || donor.address,
          city: validated.donor.city || donor.city,
          postcode: validated.donor.postcode || donor.postcode,
          country: validated.donor.country || donor.country,
        },
      })
    }

    const order = await prisma.demoOrder.create({
      data: {
        orderNumber,
        status: "PENDING",
        subtotalPence: validated.subtotalPence,
        feesPence: validated.feesPence,
        totalPence: validated.totalPence,
        coverFees: validated.donor.coverFees,
        giftAid: validated.donor.giftAid,
        marketingEmail: validated.donor.marketingEmail,
        marketingSMS: validated.donor.marketingSMS,
        donorFirstName: validated.donor.firstName,
        donorLastName: validated.donor.lastName,
        donorEmail: validated.donor.email,
        donorPhone: validated.donor.phone || null,
        donorAddress: validated.donor.address || null,
        donorCity: validated.donor.city || null,
        donorPostcode: validated.donor.postcode || null,
        donorCountry: validated.donor.country || null,
        items: {
          create: validated.items.map((item) => ({
            appealId: item.appealId || null,
            fundraiserId: item.fundraiserId || null,
            productId: item.productId || null,
            appealTitle: item.appealTitle,
            productName: item.productName || null,
            frequency: item.frequency,
            donationType: item.donationType,
            amountPence: item.amountPence,
          })),
        },
      },
      include: { items: true },
    })

    const paymentMethod = PAYMENT_METHODS.WEBSITE_STRIPE
    const collectedVia = COLLECTION_SOURCES.WEBSITE

    // Appeal donations (+ recurring)
    const donations = await Promise.all(
      validated.items
        .filter(isAppealItem)
        .map(async (item) => {
          const donation = await prisma.donation.create({
            data: {
              donorId: donor.id,
              appealId: item.appealId!,
              fundraiserId: item.fundraiserId || null,
              productId: item.productId || null,
              amountPence: item.amountPence,
              donationType: item.donationType,
              frequency: item.frequency,
              paymentMethod,
              collectedVia,
              status: "PENDING",
              giftAid: validated.donor.giftAid,
              billingAddress: validated.donor.billingAddress || null,
              billingCity: validated.donor.billingCity || null,
              billingPostcode: validated.donor.billingPostcode || null,
              billingCountry: validated.donor.billingCountry || null,
              orderNumber,
            },
          })

          if (item.frequency === "MONTHLY" || item.frequency === "YEARLY") {
            await prisma.recurringDonation.create({
              data: {
                donorId: donor.id,
                appealId: item.appealId!,
                amountPence: item.amountPence,
                donationType: item.donationType,
                frequency: item.frequency,
                paymentMethod,
                status: "PENDING",
              },
            })
          }

          return donation
        })
    )

    // Water project donations
    await Promise.all(
      validated.items
        .filter(isWaterProjectItem)
        .map(async (item) => {
          if (!item.waterProjectId || !item.waterProjectCountryId) {
            throw new Error("Water project item is missing required information")
          }

          const [project, country] = await Promise.all([
            prisma.waterProject.findUnique({ where: { id: item.waterProjectId } }),
            prisma.waterProjectCountry.findUnique({ where: { id: item.waterProjectCountryId } }),
          ])

          if (!project) throw new Error("Water project not found")
          if (!country) throw new Error("Water project country not found")
          if (country.projectType !== project.projectType) {
            throw new Error("Water project country does not match project type")
          }
          if (item.amountPence !== country.pricePence) {
            throw new Error("Water project amount does not match selected country price")
          }

          const donation = await prisma.waterProjectDonation.create({
            data: {
              waterProjectId: item.waterProjectId,
              countryId: item.waterProjectCountryId,
              donorId: donor.id,
              amountPence: item.amountPence,
              donationType: item.donationType,
              paymentMethod,
              collectedVia,
              transactionId: null,
              giftAid: validated.donor.giftAid,
              billingAddress: validated.donor.billingAddress || null,
              billingCity: validated.donor.billingCity || null,
              billingPostcode: validated.donor.billingPostcode || null,
              billingCountry: validated.donor.billingCountry || null,
              emailSent: false,
              reportSent: false,
              notes: item.plaqueName ? `Plaque Name: ${item.plaqueName}` : null,
            },
            include: {
              waterProject: true,
              country: true,
              donor: true,
            },
          })

          if (!project.status) {
            await prisma.waterProject.update({
              where: { id: project.id },
              data: { status: "WAITING_TO_REVIEW" },
            })
          }

          try {
            await sendWaterProjectDonationEmail({
              donorEmail: donation.donor.email,
              donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
              projectType: donation.waterProject.projectType,
              country: donation.country.country,
              amount: donation.amountPence,
              donationType: donation.donationType,
            })
            await prisma.waterProjectDonation.update({
              where: { id: donation.id },
              data: { emailSent: true },
            })
          } catch (emailError) {
            console.error("Error sending water project donation email:", emailError)
          }
        })
    )

    // Sponsorship donations
    await Promise.all(
      validated.items
        .filter(isSponsorshipItem)
        .map(async (item) => {
          if (!item.sponsorshipProjectId || !item.sponsorshipCountryId) {
            throw new Error("Sponsorship item is missing required information")
          }

          const [project, country] = await Promise.all([
            prisma.sponsorshipProject.findUnique({ where: { id: item.sponsorshipProjectId } }),
            prisma.sponsorshipProjectCountry.findUnique({ where: { id: item.sponsorshipCountryId } }),
          ])

          if (!project) throw new Error("Sponsorship project not found")
          if (!country) throw new Error("Sponsorship country not found")
          if (country.projectType !== project.projectType) {
            throw new Error("Sponsorship country does not match project type")
          }
          if (item.amountPence !== country.pricePence) {
            throw new Error("Sponsorship amount does not match selected country price")
          }

          const donation = await prisma.sponsorshipDonation.create({
            data: {
              sponsorshipProjectId: item.sponsorshipProjectId,
              countryId: item.sponsorshipCountryId,
              donorId: donor.id,
              amountPence: item.amountPence,
              donationType: item.donationType,
              paymentMethod,
              collectedVia,
              transactionId: null,
              giftAid: validated.donor.giftAid,
              billingAddress: validated.donor.billingAddress || null,
              billingCity: validated.donor.billingCity || null,
              billingPostcode: validated.donor.billingPostcode || null,
              billingCountry: validated.donor.billingCountry || null,
              emailSent: false,
              reportSent: false,
            },
            include: {
              sponsorshipProject: true,
              country: true,
              donor: true,
            },
          })

          if (!project.status) {
            await prisma.sponsorshipProject.update({
              where: { id: project.id },
              data: { status: "WAITING_TO_REVIEW" },
            })
          }

          try {
            await sendSponsorshipDonationEmail({
              donorEmail: donation.donor.email,
              donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
              projectType: donation.sponsorshipProject.projectType,
              country: donation.country.country,
              location: donation.sponsorshipProject.location || undefined,
              amount: donation.amountPence,
              donationType: donation.donationType,
            })
            await prisma.sponsorshipDonation.update({
              where: { id: donation.id },
              data: { emailSent: true },
            })
          } catch (emailError) {
            console.error("Error sending sponsorship donation email:", emailError)
          }
        })
    )

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      donations: donations.map((d) => d.id),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }
    console.error("Checkout error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}
