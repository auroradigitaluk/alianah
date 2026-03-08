import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const VALID_STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const

export async function GET(request: NextRequest) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get("status")
  const status =
    statusParam && VALID_STATUSES.includes(statusParam as (typeof VALID_STATUSES)[number])
      ? (statusParam as (typeof VALID_STATUSES)[number])
      : "PENDING_REVIEW"

  try {
    const list = await prisma.fundraiserCashDonation.findMany({
      where: { status },
      orderBy: status === "PENDING_REVIEW" ? { createdAt: "asc" } : { reviewedAt: "desc" },
      include: {
        fundraiser: {
          include: {
            appeal: { select: { title: true } },
            waterProject: { select: { projectType: true } },
          },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    return NextResponse.json(
      list.map((d) => {
        const f = d.fundraiser
        const campaignTitle = f
          ? (f.appeal?.title ??
            (f.waterProject
              ? f.waterProject.projectType.replace(/_/g, " ")
              : "Unknown"))
          : "Deleted fundraiser"
        return {
          id: d.id,
          fundraiserId: d.fundraiserId,
          amountPence: d.amountPence,
          donorName: d.donorName,
          notes: d.notes,
          receivedAt: d.receivedAt.toISOString(),
          status: d.status,
          createdAt: d.createdAt.toISOString(),
          reviewedAt: d.reviewedAt?.toISOString() ?? null,
          reviewedBy: d.reviewedBy
            ? {
                id: d.reviewedBy.id,
                firstName: d.reviewedBy.firstName,
                lastName: d.reviewedBy.lastName,
                email: d.reviewedBy.email,
              }
            : null,
          fundraiser: f
            ? {
                id: f.id,
                title: f.title,
                slug: f.slug,
                fundraiserName: f.fundraiserName,
                email: f.email,
                campaignTitle,
              }
            : null,
        }
      })
    )
  } catch (error) {
    console.error("Admin fundraiser cash donations GET error:", error)
    const err = error as { code?: string; message?: string }
    const message =
      typeof err?.code === "string"
        ? "Database error. Try running: npx prisma migrate deploy"
        : typeof err?.message === "string"
          ? err.message
          : "Failed to load cash donations"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
