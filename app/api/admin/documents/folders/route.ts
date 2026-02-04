import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const data = createFolderSchema.parse(body)
    const parentId = data.parentId && data.parentId.trim() ? data.parentId : null

    if (parentId) {
      const parent = await prisma.documentFolder.findUnique({
        where: { id: parentId },
      })
      if (!parent) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 400 }
        )
      }
    }

    const folder = await prisma.documentFolder.create({
      data: {
        name: data.name.trim(),
        parentId,
      },
    })

    return NextResponse.json(folder)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? "Invalid input"
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error("Create folder error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to create folder"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
