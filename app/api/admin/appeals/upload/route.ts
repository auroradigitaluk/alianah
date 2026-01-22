import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
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
    // The put function automatically uses BLOB_READ_WRITE_TOKEN from process.env
    // If token is not in env, it will throw an error which we'll catch below
    const blob = await put(`appeals/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Upload error:", error)
    let errorMessage = "Failed to upload image"
    
    if (error instanceof Error) {
      // Check for common blob storage errors
      if (error.message.includes("BLOB_READ_WRITE_TOKEN") || error.message.includes("token")) {
        errorMessage = "Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable and restart the server."
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 })
  }
}
