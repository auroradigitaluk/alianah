import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import { z } from "zod"

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
})

export async function PATCH(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const body = reorderSchema.parse(await request.json())
    const updates = body.orderedIds.map((id, index) =>
      prisma.appeal.update({
        where: { id },
        data: { sortOrder: index },
      })
    )

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Appeal reorder error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    const errorMessage = error instanceof Error ? error.message : "Failed to reorder appeals"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
