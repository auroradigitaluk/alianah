import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { ensureWaterFundraiserConsolidated } from "@/lib/water-fundraiser-consolidate"
import { generateDonationNumber } from "@/lib/donation-number"
import { sendOfflineDonationReceiptEmail } from "@/lib/email"
import { z } from "zod"

export const dynamic = "force-dynamic"

const statusPatchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
})

const editPatchSchema = z.object({
  amountPence: z.number().int().positive().optional(),
  donationType: z.enum(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]).optional(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER"]).optional(),
  receivedAt: z.string().optional(),
  donorName: z.string().max(200).nullable().optional(),
  donorEmail: z.string().email().max(320).nullable().optional().or(z.literal("")),
  donorPhone: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.fundraiserCashDonation.findUnique({
      where: { id },
      select: { id: true, status: true, fundraiserId: true },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Edit flow: update fields on APPROVED record (from offline income page)
    if (body.status === undefined && (body.amountPence != null || body.donationType != null || body.paymentMethod != null || body.receivedAt != null || body.donorName !== undefined || body.donorEmail !== undefined || body.donorPhone !== undefined || body.notes !== undefined)) {
      if (existing.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Only approved fundraiser cash donations can be edited" },
          { status: 400 }
        )
      }
      const parsed = editPatchSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues.map((i) => i.message).join("; ") },
          { status: 400 }
        )
      }
      const data: {
        amountPence?: number
        donationType?: string
        paymentMethod?: string
        receivedAt?: Date
        donorName?: string | null
        donorEmail?: string | null
        donorPhone?: string | null
        notes?: string | null
      } = {}
      if (parsed.data.amountPence != null) data.amountPence = parsed.data.amountPence
      if (parsed.data.donationType != null) data.donationType = parsed.data.donationType
      if (parsed.data.paymentMethod != null) data.paymentMethod = parsed.data.paymentMethod
      if (parsed.data.receivedAt != null) data.receivedAt = new Date(parsed.data.receivedAt)
      if (parsed.data.donorName !== undefined) data.donorName = parsed.data.donorName || null
      if (parsed.data.donorEmail !== undefined) data.donorEmail = parsed.data.donorEmail && parsed.data.donorEmail !== "" ? parsed.data.donorEmail : null
      if (parsed.data.donorPhone !== undefined) data.donorPhone = parsed.data.donorPhone || null
      if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null

      await prisma.fundraiserCashDonation.update({
        where: { id },
        data,
      })
      return NextResponse.json({ ok: true })
    }

    // Status flow: approve/reject
    const { status } = statusPatchSchema.parse(body)
    // Allow: PENDING_REVIEW -> APPROVED/REJECTED; APPROVED -> REJECTED; REJECTED -> APPROVED
    const canChange =
      existing.status === "PENDING_REVIEW" ||
      (existing.status === "APPROVED" && status === "REJECTED") ||
      (existing.status === "REJECTED" && status === "APPROVED")
    if (!canChange) {
      return NextResponse.json(
        { error: "Cannot change status from " + existing.status + " to " + status },
        { status: 400 }
      )
    }

    const updateData: {
      status: string
      reviewedAt: Date
      reviewedByAdminUserId: string
      donationNumber?: string
    } = {
      status,
      reviewedAt: new Date(),
      reviewedByAdminUserId: user.id,
    }
    if (status === "APPROVED") {
      updateData.donationNumber = await generateDonationNumber()
    }
    const updated = await prisma.fundraiserCashDonation.update({
      where: { id },
      data: updateData,
      include: {
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    // When approving, ensure water fundraiser gets consolidated pump/well/tank on water projects page if target now met
    if (status === "APPROVED" && updated.fundraiserId) {
      try {
        await ensureWaterFundraiserConsolidated(updated.fundraiserId)
      } catch (err) {
        console.error("ensureWaterFundraiserConsolidated after cash approve:", err)
      }
    }

    // When approving, send donation receipt to donor if they provided an email
    if (status === "APPROVED" && updated.donorEmail?.trim()) {
      try {
        const full = await prisma.fundraiserCashDonation.findUnique({
          where: { id: updated.id },
          include: {
            fundraiser: {
              select: {
                appeal: { select: { title: true } },
                waterProject: { select: { projectType: true } },
                title: true,
              },
            },
          },
        })
        if (full?.fundraiser) {
          const campaignTitle =
            full.fundraiser.appeal?.title ??
            (full.fundraiser.waterProject
              ? full.fundraiser.waterProject.projectType.replace(/_/g, " ")
              : null) ??
            full.fundraiser.title ??
            "Fundraiser"
          await sendOfflineDonationReceiptEmail({
            donorEmail: full.donorEmail!.trim(),
            donorName: full.donorName?.trim() || "Donor",
            appealTitle: campaignTitle,
            amountPence: full.amountPence,
            donationType: full.donationType,
            receivedAt: full.receivedAt,
            donationNumber: full.donationNumber ?? updated.donationNumber ?? `FC-${full.id.slice(-8).toUpperCase()}`,
          })
        }
      } catch (err) {
        console.error("Failed to send fundraiser cash donation receipt:", err)
        // Don't fail the approval; receipt is best-effort
      }
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      reviewedBy: updated.reviewedBy
        ? {
            id: updated.reviewedBy.id,
            firstName: updated.reviewedBy.firstName,
            lastName: updated.reviewedBy.lastName,
            email: updated.reviewedBy.email,
          }
        : null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      )
    }
    console.error("Admin fundraiser cash donation PATCH error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
