import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const blob = await put(`sponsorships/reports/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: "application/pdf",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Error uploading sponsorship PDF:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
