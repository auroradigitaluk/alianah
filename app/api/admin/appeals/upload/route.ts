import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check if BLOB_READ_WRITE_TOKEN is configured
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      console.error("BLOB_READ_WRITE_TOKEN is not configured")
      return NextResponse.json({ 
        error: "Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable." 
      }, { status: 500 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`appeals/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      token, // Explicitly pass token
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image"
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
