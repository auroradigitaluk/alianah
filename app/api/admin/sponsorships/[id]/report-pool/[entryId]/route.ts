import { NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { isPoolEntryAvailable } from "@/lib/sponsorship-report-pool"

const VALID_ID = /^[a-zA-Z0-9_-]+$/

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err

  try {
    const { id: projectId, entryId } = await params
    if (!projectId || !VALID_ID.test(projectId) || !entryId || !VALID_ID.test(entryId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }

    const entry = await prisma.sponsorshipReportPool.findFirst({
      where: { id: entryId, sponsorshipProjectId: projectId },
    })

    if (!entry) {
      return NextResponse.json({ error: "Pool entry not found" }, { status: 404 })
    }

    if (!isPoolEntryAvailable(entry)) {
      return NextResponse.json(
        { error: "Cannot delete a report that is already assigned to a sponsor" },
        { status: 400 }
      )
    }

    try {
      await del(entry.pdfUrl)
    } catch {
      // Blob may already be deleted
    }

    await prisma.sponsorshipReportPool.delete({ where: { id: entryId } })

    const poolAvailableWhere = {
      sponsorshipProjectId: projectId,
      assignedDonationId: null,
      assignedRecurringRef: null,
    }

    const [total, available] = await Promise.all([
      prisma.sponsorshipReportPool.count({ where: { sponsorshipProjectId: projectId } }),
      prisma.sponsorshipReportPool.count({ where: poolAvailableWhere }),
    ])

    return NextResponse.json({ total, available })
  } catch (error) {
    console.error("Report pool DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
