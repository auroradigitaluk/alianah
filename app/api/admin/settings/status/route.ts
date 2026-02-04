import { NextResponse } from "next/server"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

export async function GET() {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const stripeMode = stripeKey?.startsWith("sk_live_")
      ? "live"
      : stripeKey?.startsWith("sk_test_")
        ? "test"
        : null

    const integrations = {
      stripe: {
        connected: !!stripeKey,
        mode: stripeMode,
      },
      resend: {
        connected: !!process.env.RESEND_API_KEY,
      },
      blob: {
        connected: !!process.env.BLOB_READ_WRITE_TOKEN,
      },
    }

    const general = {
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      environment:
        process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
    }

    return NextResponse.json({ integrations, general })
  } catch (error) {
    console.error("Settings status error:", error)
    return NextResponse.json(
      { error: "Failed to load settings status" },
      { status: 500 }
    )
  }
}
