import { NextRequest, NextResponse } from "next/server"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"
import { resendOfflineIncomeReceipt } from "@/lib/offline-income-receipt"

export const dynamic = "force-dynamic"

async function assertStaffAccess(
  compositeId: string,
  user: { id: string; role: string }
): Promise<{ ok: true } | { ok: false; status: number }> {
  if (user.role !== "STAFF") return { ok: true }

  if (compositeId.startsWith("water-")) {
    const row = await prisma.waterProjectDonation.findUnique({
      where: { id: compositeId.replace("water-", "") },
      select: { addedByAdminUserId: true },
    })
    if (!row || row.addedByAdminUserId !== user.id) return { ok: false, status: 403 }
    return { ok: true }
  }
  if (compositeId.startsWith("sponsorship-")) {
    const row = await prisma.sponsorshipDonation.findUnique({
      where: { id: compositeId.replace("sponsorship-", "") },
      select: { addedByAdminUserId: true },
    })
    if (!row || row.addedByAdminUserId !== user.id) return { ok: false, status: 403 }
    return { ok: true }
  }
  if (compositeId.startsWith("qurbani-")) {
    const row = await prisma.qurbaniDonation.findUnique({
      where: { id: compositeId.replace("qurbani-", "") },
      select: { addedByAdminUserId: true },
    })
    if (!row || row.addedByAdminUserId !== user.id) return { ok: false, status: 403 }
    return { ok: true }
  }
  if (compositeId.startsWith("fundraiser_cash-")) {
    const row = await prisma.fundraiserCashDonation.findUnique({
      where: { id: compositeId.replace("fundraiser_cash-", "") },
      select: { reviewedByAdminUserId: true },
    })
    if (!row || row.reviewedByAdminUserId !== user.id) return { ok: false, status: 403 }
    return { ok: true }
  }
  const row = await prisma.offlineIncome.findUnique({
    where: { id: compositeId },
    select: { addedByAdminUserId: true },
  })
  if (!row || row.addedByAdminUserId !== user.id) return { ok: false, status: 403 }
  return { ok: true }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminRoleSafe(["ADMIN", "STAFF"])
  if (err) return err
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const access = await assertStaffAccess(id, user)
    if (!access.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await resendOfflineIncomeReceipt(id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Resend offline income receipt error:", error)
    return NextResponse.json(
      { error: "Failed to send receipt email" },
      { status: 500 }
    )
  }
}
