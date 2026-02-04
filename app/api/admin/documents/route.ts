import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId") || undefined

    let breadcrumb: { id: string; name: string }[] = []
    if (folderId) {
      let current: { id: string; name: string; parentId: string | null } | null =
        await prisma.documentFolder.findUnique({
          where: { id: folderId },
          select: { id: true, name: true, parentId: true },
        })
      const path: { id: string; name: string }[] = []
      while (current) {
        path.unshift({ id: current.id, name: current.name })
        current = current.parentId
          ? await prisma.documentFolder.findUnique({
              where: { id: current.parentId },
              select: { id: true, name: true, parentId: true },
            })
          : null
      }
      breadcrumb = path
    }

    const [folders, files] = await Promise.all([
      prisma.documentFolder.findMany({
        where: { parentId: folderId ?? null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.documentFile.findMany({
        where: { folderId: folderId ?? null },
        orderBy: { name: "asc" },
      }),
    ])

    return NextResponse.json({ folders, files, breadcrumb })
  } catch (error) {
    console.error("Documents list error:", error)
    return NextResponse.json(
      { error: "Failed to load documents" },
      { status: 500 }
    )
  }
}
