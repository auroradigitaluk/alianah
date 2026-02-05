import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Keep it under 5MB." },
        { status: 400 }
      )
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
