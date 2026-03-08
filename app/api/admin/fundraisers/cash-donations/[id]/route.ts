import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { ensureWaterFundraiserConsolidated } from "@/lib/water-fundraiser-consolidate"
import { z } from "zod"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
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
    const { status } = patchSchema.parse(body)

    const existing = await prisma.fundraiserCashDonation.findUnique({
      where: { id },
      select: { id: true, status: true, fundraiserId: true },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
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

    const updated = await prisma.fundraiserCashDonation.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedByAdminUserId: user.id,
      },
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
