import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireAdminAuthSafe } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const urls: string[] = []

    for (const file of files) {
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

      const blob = await put(`water-projects/${Date.now()}-${file.name}`, file, {
        access: "public",
      })
      urls.push(blob.url)
    }

    return NextResponse.json({ urls })
  } catch (error) {
    console.error("Error uploading images:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
