import { NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const renameSchema = z.object({
  name: z.string().min(1).max(255),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json()
    const { name } = renameSchema.parse(body)

    const folder = await prisma.documentFolder.findUnique({
      where: { id },
    })
    if (folder) {
      const updated = await prisma.documentFolder.update({
        where: { id },
        data: { name: name.trim() },
      })
      return NextResponse.json(updated)
    }

    const file = await prisma.documentFile.findUnique({
      where: { id },
    })
    if (file) {
      const updated = await prisma.documentFile.update({
        where: { id },
        data: { name: name.trim() },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }
    console.error("Rename error:", error)
    return NextResponse.json({ error: "Failed to rename" }, { status: 500 })
  }
}

async function deleteFolderRecursive(folderId: string): Promise<void> {
  const children = await prisma.documentFolder.findMany({
    where: { parentId: folderId },
  })
  for (const child of children) {
    await deleteFolderRecursive(child.id)
  }

  const files = await prisma.documentFile.findMany({
    where: { folderId },
  })
  for (const file of files) {
    try {
      await del(file.blobUrl)
    } catch {
      // Blob may already be deleted
    }
  }
  await prisma.documentFile.deleteMany({ where: { folderId } })
  await prisma.documentFolder.delete({ where: { id: folderId } })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params

    const folder = await prisma.documentFolder.findUnique({
      where: { id },
      include: { children: true, files: true },
    })
    if (folder) {
      await deleteFolderRecursive(id)
      return new NextResponse(null, { status: 204 })
    }

    const file = await prisma.documentFile.findUnique({
      where: { id },
    })
    if (file) {
      try {
        await del(file.blobUrl)
      } catch {
        // Blob may already be deleted
      }
      await prisma.documentFile.delete({ where: { id } })
      return new NextResponse(null, { status: 204 })
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
