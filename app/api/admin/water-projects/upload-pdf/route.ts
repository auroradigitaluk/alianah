import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Upload PDF to Vercel Blob
    const blob = await put(`water-projects/reports/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: "application/pdf",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Error uploading PDF:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
