import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200)
}

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file || typeof file.name !== "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Invoices must be 10MB or smaller." },
        { status: 400 }
      )
    }

    const mimeType = file.type || "application/octet-stream"
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: "Allowed types: PDF, JPEG, PNG, WebP, GIF." },
        { status: 400 }
      )
    }

    const safeName = sanitizeFilename(file.name)
    const pathname = `distributions/invoices/${Date.now()}-${safeName}`

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: mimeType,
    })

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
    })
  } catch (error) {
    console.error("Distribution invoice upload error:", error)
    let message = "Failed to upload invoice"
    if (error instanceof Error) {
      if (error.message.includes("BLOB_READ_WRITE_TOKEN") || error.message.includes("token")) {
        message =
          "Blob storage not configured. Set BLOB_READ_WRITE_TOKEN for uploads."
      } else {
        message = error.message
      }
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
