import { NextRequest, NextResponse } from "next/server"
import { PAYMENT_METHODS, COLLECTION_SOURCES } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendWaterProjectDonationEmail } from "@/lib/email"

const donationSchema = z.object({
  waterProjectId: z.string(),
  countryId: z.string(), // Country chosen for this donation
  title: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
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
  amountPence: z.number().int().positive(),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
  paymentMethod: z.string(),
  transactionId: z.string().optional(),
  giftAid: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = donationSchema.parse(body)

    // Get or create donor
    let donor = await prisma.donor.findUnique({
      where: { email: data.email },
    })

    if (!donor) {
      donor = await prisma.donor.create({
        data: {
          title: data.title || null,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          postcode: data.postcode || null,
          country: data.country || null,
        },
      })
    } else {
      // Update donor info if provided
      donor = await prisma.donor.update({
        where: { id: donor.id },
        data: {
          title: data.title || donor.title,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || donor.phone,
          address: data.address || donor.address,
          city: data.city || donor.city,
          postcode: data.postcode || donor.postcode,
          country: data.country || donor.country,
        },
      })
    }

    // Get the country to verify it exists and get its price
    const country = await prisma.waterProjectCountry.findUnique({
      where: { id: data.countryId },
    })

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 })
    }

    // Verify the country belongs to the project type
    const project = await prisma.waterProject.findUnique({
      where: { id: data.waterProjectId },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (country.projectType !== project.projectType) {
      return NextResponse.json({ error: "Country does not match project type" }, { status: 400 })
    }

    // Create water project donation
    const donation = await prisma.waterProjectDonation.create({
      data: {
        waterProjectId: data.waterProjectId,
        countryId: data.countryId,
        donorId: donor.id,
        amountPence: data.amountPence,
        donationType: data.donationType,
        paymentMethod: data.paymentMethod || PAYMENT_METHODS.WEBSITE_STRIPE,
        collectedVia: COLLECTION_SOURCES.WEBSITE,
        transactionId: data.transactionId || null,
        giftAid: data.giftAid,
        billingAddress: data.billingAddress || null,
        billingCity: data.billingCity || null,
        billingPostcode: data.billingPostcode || null,
        billingCountry: data.billingCountry || null,
        emailSent: false,
        reportSent: false,
      },
      include: {
        waterProject: true,
        country: true,
        donor: true,
      },
    })

    // Update water project status to WAITING_TO_REVIEW when first donation is made
    if (!project.status) {
      await prisma.waterProject.update({
        where: { id: data.waterProjectId },
        data: { status: "WAITING_TO_REVIEW" },
      })
    }

    // Send confirmation email
    try {
      await sendWaterProjectDonationEmail({
        donorEmail: donor.email,
        donorName: `${donor.firstName} ${donor.lastName}`,
        projectType: donation.waterProject.projectType,
        country: donation.country.country,
        amount: data.amountPence,
        donationType: data.donationType,
      })

      // Mark email as sent
      await prisma.waterProjectDonation.update({
        where: { id: donation.id },
        data: { emailSent: true },
      })
    } catch (emailError) {
      console.error("Error sending donation email:", emailError)
      // Don't fail the donation if email fails
    }

    return NextResponse.json({ donationId: donation.id, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error processing donation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
