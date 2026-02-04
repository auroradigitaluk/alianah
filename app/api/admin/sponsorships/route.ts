import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"

const sponsorshipProjectSchema = z.object({
  projectType: z.enum(["ORPHANS", "HIFZ", "FAMILIES"]),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  amountPence: z.number().int().default(0),
  projectImageUrls: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const body = await request.json()
    const data = sponsorshipProjectSchema.parse(body)

    const existing = await prisma.sponsorshipProject.findUnique({
      where: { projectType: data.projectType },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A project of this type already exists. Each project type can only have one project." },
        { status: 400 }
      )
    }

    const { projectImageUrls, ...rest } = data
    const project = await prisma.sponsorshipProject.create({
      data: {
        ...rest,
        ...(projectImageUrls ? { projectImageUrls: JSON.stringify(projectImageUrls) } : {}),
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating sponsorship project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get("projectType")

    const where = projectType
      ? { projectType: projectType as "ORPHANS" | "HIFZ" | "FAMILIES" }
      : {}

    const projects = await prisma.sponsorshipProject.findMany({
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
    console.error("Error fetching sponsorship projects:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
