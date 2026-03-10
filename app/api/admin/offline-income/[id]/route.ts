import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"
import { isValidPhone, isPlaceholderDonorEmail } from "@/lib/utils"
import { sendOfflineDonationReceiptEmail } from "@/lib/email"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const { id } = await params

    if (id.startsWith("water-")) {
      const donationId = id.replace("water-", "")
      const donation = await prisma.waterProjectDonation.findUnique({
        where: { id: donationId },
        include: {
          waterProject: { select: { projectType: true, location: true } },
          country: { select: { country: true } },
          addedBy: { select: { email: true, firstName: true, lastName: true } },
        },
      })
      if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 })
      if (user.role === "STAFF" && donation.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const labels: Record<string, string> = {
        WATER_PUMP: "Water Pump",
        WATER_WELL: "Water Well",
        WATER_TANK: "Water Tank",
        WUDHU_AREA: "Wudhu Area",
      }
      const projectType = (donation.waterProject?.projectType) ?? ""
      const projectLabel = labels[projectType] || projectType
      const location = donation.waterProject?.location ? ` - ${donation.waterProject.location}` : ""
      const country = donation.country?.country ? ` (${donation.country.country})` : ""
      return NextResponse.json({
        id: `water-${donation.id}`,
        amountPence: donation.amountPence,
        donationType: donation.donationType,
        source: donation.paymentMethod,
        receivedAt: donation.createdAt,
        appeal: { title: `Water Project - ${projectLabel}${location}${country}` },
        notes: donation.notes,
        addedByName: formatAdminUserName(donation.addedBy),
        itemType: "water" as const,
      })
    }

    if (id.startsWith("sponsorship-")) {
      const donationId = id.replace("sponsorship-", "")
      const donation = await prisma.sponsorshipDonation.findUnique({
        where: { id: donationId },
        include: {
          sponsorshipProject: { select: { projectType: true, location: true } },
          country: { select: { country: true } },
          addedBy: { select: { email: true, firstName: true, lastName: true } },
        },
      })
      if (!donation) return NextResponse.json({ error: "Not found" }, { status: 404 })
      if (user.role === "STAFF" && donation.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const labels: Record<string, string> = {
        ORPHANS: "Orphans",
        HIFZ: "Hifz",
        FAMILIES: "Families",
      }
      const projectType = (donation.sponsorshipProject?.projectType) ?? ""
      const projectLabel = labels[projectType] || projectType
      const location = donation.sponsorshipProject?.location ? ` - ${donation.sponsorshipProject.location}` : ""
      const country = donation.country?.country ? ` (${donation.country.country})` : ""
      return NextResponse.json({
        id: `sponsorship-${donation.id}`,
        amountPence: donation.amountPence,
        donationType: donation.donationType,
        source: donation.paymentMethod,
        receivedAt: donation.createdAt,
        appeal: { title: `Sponsorship - ${projectLabel}${location}${country}` },
        notes: donation.notes,
        addedByName: formatAdminUserName(donation.addedBy),
        itemType: "sponsorship" as const,
      })
    }

    const item = await prisma.offlineIncome.findUnique({
      where: { id },
      include: {
        appeal: { select: { title: true } },
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    })
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (user.role === "STAFF" && item.addedByAdminUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({
      id: item.id,
      amountPence: item.amountPence,
      donationType: item.donationType,
      source: item.source,
      receivedAt: item.receivedAt,
      appeal: item.appeal,
      appealId: item.appealId,
      notes: item.notes,
      addedByName: formatAdminUserName(item.addedBy),
      itemType: "appeal" as const,
    })
  } catch (error) {
    console.error("Offline income GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

const donorPhoneRefine = (v: string | undefined) => !v || isValidPhone(v)
const donorSchema = z.object({
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

const patchSchema = z.object({
  amountPence: z.number().int().positive().optional(),
  appealId: z.string().nullable().optional(),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]).optional(),
  source: z.enum(["CASH", "OFFICE_BUCKETS", "CARD_SUMUP", "BANK_TRANSFER"]).optional(),
  receivedAt: z.string().optional(),
  notes: z.string().nullable().optional(),
  giftAid: z.boolean().optional(),
  sendReceiptEmail: z.boolean().optional(),
  donor: donorSchema.optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { id } = await params
    const body = await request.json()
    const data = patchSchema.parse(body)

    if (id.startsWith("water-")) {
      const donationId = id.replace("water-", "")
      if (user.role === "STAFF") {
        const existing = await prisma.waterProjectDonation.findUnique({
          where: { id: donationId },
          select: { addedByAdminUserId: true },
        })
        if (!existing || existing.addedByAdminUserId !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
      const updateData: Record<string, unknown> = {}
      if (data.amountPence !== undefined) updateData.amountPence = data.amountPence
      if (data.donationType !== undefined) updateData.donationType = data.donationType
      if (data.source !== undefined) updateData.paymentMethod = data.source
      if (data.receivedAt !== undefined) updateData.createdAt = new Date(data.receivedAt)
      if (data.notes !== undefined) updateData.notes = data.notes
      await prisma.waterProjectDonation.update({
        where: { id: donationId },
        data: updateData,
      })
      return NextResponse.json({ success: true })
    }

    if (id.startsWith("sponsorship-")) {
      const donationId = id.replace("sponsorship-", "")
      if (user.role === "STAFF") {
        const existing = await prisma.sponsorshipDonation.findUnique({
          where: { id: donationId },
          select: { addedByAdminUserId: true },
        })
        if (!existing || existing.addedByAdminUserId !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
      const updateData: Record<string, unknown> = {}
      if (data.amountPence !== undefined) updateData.amountPence = data.amountPence
      if (data.donationType !== undefined) updateData.donationType = data.donationType
      if (data.source !== undefined) updateData.paymentMethod = data.source
      if (data.receivedAt !== undefined) updateData.createdAt = new Date(data.receivedAt)
      if (data.notes !== undefined) updateData.notes = data.notes
      await prisma.sponsorshipDonation.update({
        where: { id: donationId },
        data: updateData,
      })
      return NextResponse.json({ success: true })
    }

    if (user.role === "STAFF") {
      const existing = await prisma.offlineIncome.findUnique({
        where: { id },
        select: { addedByAdminUserId: true },
      })
      if (!existing || existing.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    const updateData: Record<string, unknown> = {}
    if (data.amountPence !== undefined) updateData.amountPence = data.amountPence
    if (data.appealId !== undefined) updateData.appealId = data.appealId
    if (data.donationType !== undefined) updateData.donationType = data.donationType
    if (data.source !== undefined) updateData.source = data.source
    if (data.receivedAt !== undefined) updateData.receivedAt = new Date(data.receivedAt)
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.giftAid !== undefined) updateData.giftAid = data.giftAid

    const giftAid = data.giftAid === true
    const sendReceiptEmail = data.sendReceiptEmail === true
    const donorInput = data.donor
    let donorId: string | null | undefined = undefined
    let billingAddress: string | null | undefined = undefined
    let billingCity: string | null | undefined = undefined
    let billingPostcode: string | null | undefined = undefined
    let billingCountry: string | null | undefined = undefined

    if ((giftAid || sendReceiptEmail) && donorInput) {
      const makeFallbackEmail = () =>
        `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@alianahapp.local`
      const emailProvided = donorInput.email?.trim()
      const firstProvided = donorInput.firstName?.trim()
      const lastProvided = donorInput.lastName?.trim()
      if (sendReceiptEmail) {
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
    if (donorId !== undefined) updateData.donorId = donorId
    if (billingAddress !== undefined) updateData.billingAddress = billingAddress
    if (billingCity !== undefined) updateData.billingCity = billingCity
    if (billingPostcode !== undefined) updateData.billingPostcode = billingPostcode
    if (billingCountry !== undefined) updateData.billingCountry = billingCountry

    const updated = await prisma.offlineIncome.update({
      where: { id },
      data: updateData,
      include: { donor: true, appeal: { select: { title: true } } },
    })

    if (
      sendReceiptEmail &&
      updated.donor &&
      updated.appeal &&
      !isPlaceholderDonorEmail(updated.donor.email)
    ) {
      try {
        await sendOfflineDonationReceiptEmail({
          donorEmail: updated.donor.email,
          donorName: [updated.donor.firstName, updated.donor.lastName].filter(Boolean).join(" ") || "Donor",
          appealTitle: updated.appeal.title,
          amountPence: updated.amountPence,
          donationType: updated.donationType,
          receivedAt: updated.receivedAt,
          donationNumber: updated.donationNumber ?? updated.id,
        })
      } catch (err) {
        console.error("Failed to send offline donation receipt:", err)
        return NextResponse.json(
          { error: "Entry saved but receipt email failed to send" },
          { status: 500 }
        )
      }
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0]
      return NextResponse.json(
        { error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid request" },
        { status: 400 }
      )
    }
    console.error("Offline income PATCH error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user || !["ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const { id } = await params

    if (id.startsWith("water-")) {
      const donationId = id.replace("water-", "")
      if (user.role === "STAFF") {
        const existing = await prisma.waterProjectDonation.findUnique({
          where: { id: donationId },
          select: { addedByAdminUserId: true },
        })
        if (!existing || existing.addedByAdminUserId !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
      await prisma.waterProjectDonation.delete({
        where: { id: donationId },
      })
      return NextResponse.json({ success: true })
    }

    if (id.startsWith("sponsorship-")) {
      const donationId = id.replace("sponsorship-", "")
      if (user.role === "STAFF") {
        const existing = await prisma.sponsorshipDonation.findUnique({
          where: { id: donationId },
          select: { addedByAdminUserId: true },
        })
        if (!existing || existing.addedByAdminUserId !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
      await prisma.sponsorshipDonation.delete({
        where: { id: donationId },
      })
      return NextResponse.json({ success: true })
    }

    if (id.startsWith("fundraiser_cash-")) {
      const donationId = id.replace("fundraiser_cash-", "")
      if (user.role === "STAFF") {
        const existing = await prisma.fundraiserCashDonation.findUnique({
          where: { id: donationId },
          select: { reviewedByAdminUserId: true },
        })
        if (!existing || existing.reviewedByAdminUserId !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }
      await prisma.fundraiserCashDonation.delete({
        where: { id: donationId },
      })
      return NextResponse.json({ success: true })
    }

    if (user.role === "STAFF") {
      const existing = await prisma.offlineIncome.findUnique({
        where: { id },
        select: { addedByAdminUserId: true },
      })
      if (!existing || existing.addedByAdminUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    await prisma.offlineIncome.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Offline income DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
