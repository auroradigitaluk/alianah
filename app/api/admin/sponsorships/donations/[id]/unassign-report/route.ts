import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err

  try {
    const { id } = await params

    const donation = await prisma.sponsorshipDonation.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    }

    const poolEntry = await prisma.sponsorshipReportPool.findFirst({
      where: { assignedDonationId: id },
    })

    if (!poolEntry) {
      return NextResponse.json({ error: "No report assigned to this sponsor" }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.sponsorshipReportPool.update({
        where: { id: poolEntry.id },
        data: { assignedDonationId: null },
      }),
      prisma.sponsorshipDonation.update({
        where: { id },
        data: {
          reportSent: false,
          status: donation.status === "COMPLETE" ? "PENDING" : donation.status,
          completedAt: null,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unassigning sponsorship report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
