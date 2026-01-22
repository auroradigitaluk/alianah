import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendWaterProjectDonationEmail } from "@/lib/email"

const waterProjectSchema = z.object({
  projectType: z.enum(["WATER_PUMP", "WATER_WELL", "WATER_TANK", "WUDHU_AREA"]),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  amountPence: z.number().int().default(0),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = waterProjectSchema.parse(body)

    // Check if project type already exists
    const existing = await prisma.waterProject.findUnique({
      where: { projectType: data.projectType },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A project of this type already exists. Each project type can only have one project." },
        { status: 400 }
      )
    }

    const project = await prisma.waterProject.create({
      data,
    })

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating water project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get("projectType")

    const where = projectType ? { projectType: projectType as any } : {}

    const projects = await prisma.waterProject.findMany({
      where,
      include: {
        donations: {
          include: {
            donor: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Error fetching water projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
