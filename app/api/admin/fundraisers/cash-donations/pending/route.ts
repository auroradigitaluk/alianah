import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const list = await prisma.fundraiserCashDonation.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: {
        fundraiser: {
          include: {
            appeal: { select: { title: true } },
            waterProject: { select: { projectType: true } },
          },
        },
      },
    })

    return NextResponse.json(
      list.map((d) => {
        const f = d.fundraiser
        const campaignTitle =
          f.appeal?.title ??
          (f.waterProject
            ? f.waterProject.projectType.replace(/_/g, " ")
            : "Unknown")
        return {
          id: d.id,
          fundraiserId: d.fundraiserId,
          amountPence: d.amountPence,
          donorName: d.donorName,
          notes: d.notes,
          receivedAt: d.receivedAt.toISOString(),
          status: d.status,
          createdAt: d.createdAt.toISOString(),
          fundraiser: {
            id: f.id,
            title: f.title,
            slug: f.slug,
            fundraiserName: f.fundraiserName,
            email: f.email,
            campaignTitle,
          },
        }
      })
    )
  } catch (error) {
    console.error("Admin fundraiser cash donations pending GET error:", error)
    const err = error as { code?: string; message?: string }
    const message =
      typeof err?.code === "string"
        ? "Database error. Try running: npx prisma migrate deploy"
        : typeof err?.message === "string"
          ? err.message
          : "Failed to load pending cash donations"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
