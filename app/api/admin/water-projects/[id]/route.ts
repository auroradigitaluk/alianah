import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { sendWaterProjectCompletionEmail } from "@/lib/email"

const waterProjectSchema = z.object({
  projectType: z.enum(["WATER_PUMP", "WATER_WELL", "WATER_TANK", "WUDHU_AREA"]).optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  plaqueAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["WAITING_TO_REVIEW", "ORDERED", "PENDING", "COMPLETE"]).nullable().optional(),
  amountPence: z.number().int().default(0).optional(),
  projectImageUrls: z.array(z.string()).optional(),
  completionImages: z.array(z.string()).optional(),
  completionReport: z.string().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await prisma.waterProject.findUnique({
      where: { id },
      include: {
        donations: {
          include: {
            donor: true,
            country: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching water project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = waterProjectSchema.parse(body)

    // Get current project to check status change
    const currentProject = await prisma.waterProject.findUnique({
      where: { id },
      include: {
        donations: {
          include: {
            donor: true,
          },
        },
      },
    })

    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // If status is changing to COMPLETE and we have images/report, send emails
    const isCompleting = data.status === "COMPLETE" && currentProject.status !== "COMPLETE"
    const hasCompletionData = data.completionImages && data.completionImages.length > 0

    const updateData: Prisma.WaterProjectUpdateInput = {
      projectType: data.projectType,
      location: data.location,
      description: data.description,
      plaqueAvailable: data.plaqueAvailable,
      isActive: data.isActive,
      status: data.status,
      amountPence: data.amountPence,
      completionReport: data.completionReport,
      ...(data.projectImageUrls ? { projectImageUrls: JSON.stringify(data.projectImageUrls) } : {}),
      ...(data.completionImages ? { completionImages: JSON.stringify(data.completionImages) } : {}),
      ...(isCompleting ? { completedAt: new Date() } : {}),
    }

    const project = await prisma.waterProject.update({
      where: { id },
      data: updateData,
      include: {
        donations: {
          include: {
            donor: true,
            country: true,
          },
        },
      },
    })

    // Send completion emails if project is completed
    if (isCompleting && hasCompletionData && project.donations.length > 0) {
      for (const donation of project.donations) {
        if (!donation.reportSent) {
          try {
            await sendWaterProjectCompletionEmail({
              donorEmail: donation.donor.email,
              donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
              projectType: project.projectType,
              country: donation.country.country,
              images: data.completionImages || [],
              report: data.completionReport || "",
            })

            // Mark report as sent
            await prisma.waterProjectDonation.update({
              where: { id: donation.id },
              data: { reportSent: true },
            })
          } catch (emailError) {
            console.error("Error sending completion email:", emailError)
            // Continue with other donations even if one fails
          }
        }
      }
    }

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating water project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.waterProject.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting water project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
