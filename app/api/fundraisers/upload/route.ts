import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Keep it under 5MB." },
        { status: 400 }
      )
    }

    const blob = await put(`fundraisers/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Fundraiser image upload error:", error)
    let errorMessage = "Failed to upload image"

    if (error instanceof Error) {
      if (error.message.includes("BLOB_READ_WRITE_TOKEN") || error.message.includes("token")) {
        errorMessage =
          "Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable and restart the server."
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

