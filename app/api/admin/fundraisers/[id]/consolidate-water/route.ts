import { NextResponse } from "next/server"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { ensureWaterFundraiserConsolidated } from "@/lib/water-fundraiser-consolidate"

export const dynamic = "force-dynamic"

/**
 * POST: Create the consolidated water project donation (one pump/well/tank/wudhu) for this
 * water fundraiser so it appears on the water projects admin page. Idempotent: if target
 * not met or already consolidated, returns alreadyDone or notEligible.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const { id } = await params
    const consolidated = await ensureWaterFundraiserConsolidated(id)
    if (consolidated) {
      return NextResponse.json({
        success: true,
        donationId: consolidated.id,
        message: "Added to water projects page for processing.",
      })
    }
    return NextResponse.json({
      alreadyDone: true,
      message:
        "Either already added to water projects, target not yet met, or fundraiser is not eligible.",
    })
  } catch (error) {
    console.error("Consolidate water fundraiser error:", error)
    return NextResponse.json(
      { error: "Failed to add to water projects" },
      { status: 500 }
    )
  }
}
