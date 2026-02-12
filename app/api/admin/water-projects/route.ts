import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"

const waterProjectSchema = z
  .object({
    projectType: z.enum(["WATER_PUMP", "WATER_WELL", "WATER_TANK", "WUDHU_AREA"]),
    location: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    plaqueAvailable: z.boolean().optional().default(false),
    isActive: z.boolean().default(true),
    allowFundraising: z.boolean().optional().default(false),
    fundraisingImageUrls: z.array(z.string()).optional(),
    fundraisingDefaultMessage: z.string().nullable().optional(),
    amountPence: z.number().int().default(0),
    projectImageUrls: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.allowFundraising && (!data.fundraisingImageUrls || data.fundraisingImageUrls.length < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fundraisingImageUrls"],
        message: "At least 1 fundraising image is required when fundraising is enabled.",
      })
    }
  })

export async function POST(request: NextRequest) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
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

    const { projectImageUrls, fundraisingImageUrls, fundraisingDefaultMessage, ...rest } = data
    const project = await prisma.waterProject.create({
      data: {
        ...rest,
        ...(projectImageUrls ? { projectImageUrls: JSON.stringify(projectImageUrls) } : {}),
        ...(fundraisingImageUrls
          ? { fundraisingImageUrls: JSON.stringify(fundraisingImageUrls) }
          : {}),
        fundraisingDefaultMessage: fundraisingDefaultMessage || null,
      },
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
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get("projectType")

    const where = projectType 
      ? { projectType: projectType as "WATER_PUMP" | "WATER_WELL" | "WATER_TANK" | "WUDHU_AREA" }
      : {}

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
