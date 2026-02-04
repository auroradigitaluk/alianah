import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB - consistent with app defaults

const ALLOWED_TYPES = [
  "application/pdf",
  "image/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]

function isAllowedType(mimeType: string): boolean {
  return ALLOWED_TYPES.some(
    (t) => mimeType === t || (t.endsWith("/") && mimeType.startsWith(t))
  )
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200)
}

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folderId = (formData.get("folderId") as string) || null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size too large. Keep it under 5MB." },
        { status: 400 }
      )
    }

    const mimeType = file.type || "application/octet-stream"
    if (!isAllowedType(mimeType)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed: PDF, images, DOC/DOCX, XLS/XLSX, TXT" },
        { status: 400 }
      )
    }

    const prefix = folderId ? `documents/${folderId}` : "documents/root"
    const safeName = sanitizeFilename(file.name)
    const pathname = `${prefix}/${Date.now()}-${safeName}`

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
    })

    const docFile = await prisma.documentFile.create({
      data: {
        folderId,
        name: file.name,
        blobUrl: blob.url,
        sizeBytes: file.size,
        mimeType,
      },
    })

    return NextResponse.json(docFile)
  } catch (error) {
    console.error("Document upload error:", error)
    let errorMessage = "Failed to upload file"
    if (error instanceof Error) {
      if (error.message.includes("BLOB_READ_WRITE_TOKEN") || error.message.includes("token")) {
        errorMessage =
          "Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable."
      } else {
        errorMessage = error.message
      }
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
