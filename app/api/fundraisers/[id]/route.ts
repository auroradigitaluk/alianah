import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  fundraiserName: z.string().min(1, "Name is required").optional(),
  message: z.string().nullable().optional(),
  targetAmountPence: z.union([z.number().int().min(1), z.null()]).optional(),
})

/** Allow logged-in fundraiser owner to update their own fundraiser (title, name, message, target). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionEmail = await getFundraiserEmail()
  if (!sessionEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id },
      select: { id: true, email: true },
    })

    if (!fundraiser) {
      return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 })
    }

    if (fundraiser.email?.trim().toLowerCase() !== sessionEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updateData: {
      title?: string
      fundraiserName?: string
      message?: string | null
      targetAmountPence?: number | null
    } = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.fundraiserName !== undefined) updateData.fundraiserName = data.fundraiserName
    if (data.message !== undefined) updateData.message = data.message
    if (data.targetAmountPence !== undefined) updateData.targetAmountPence = data.targetAmountPence

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const updated = await prisma.fundraiser.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Fundraiser PATCH error:", error)
    return NextResponse.json({ error: "Failed to update fundraiser" }, { status: 500 })
  }
}
