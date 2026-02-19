import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatAdminUserName } from "@/lib/utils"

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

const patchSchema = z.object({
  amountPence: z.number().int().positive().optional(),
  appealId: z.string().nullable().optional(),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]).optional(),
  source: z.enum(["CASH", "OFFICE_BUCKETS", "CARD_SUMUP", "BANK_TRANSFER"]).optional(),
  receivedAt: z.string().optional(),
  notes: z.string().nullable().optional(),
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
    await prisma.offlineIncome.update({
      where: { id },
      data: updateData,
    })
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
