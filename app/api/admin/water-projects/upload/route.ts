import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const urls: string[] = []

    for (const file of files) {
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
