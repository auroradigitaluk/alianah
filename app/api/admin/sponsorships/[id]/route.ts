import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"
import { sendSponsorshipCompletionEmail } from "@/lib/email"

const sponsorshipProjectSchema = z.object({
  projectType: z.enum(["ORPHANS", "HIFZ", "FAMILIES"]).optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
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
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params
    const project = await prisma.sponsorshipProject.findUnique({
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
    console.error("Error fetching sponsorship project:", error)
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
    const data = sponsorshipProjectSchema.parse(body)

    const currentProject = await prisma.sponsorshipProject.findUnique({
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

    if (!currentProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const isCompleting = data.status === "COMPLETE" && currentProject.status !== "COMPLETE"
    const hasCompletionData = data.completionImages && data.completionImages.length > 0

    const updateData: Record<string, unknown> = { ...data }
    if (data.projectImageUrls) {
      updateData.projectImageUrls = JSON.stringify(data.projectImageUrls)
    }
    if (data.completionImages) {
      updateData.completionImages = JSON.stringify(data.completionImages)
    }
    if (isCompleting) {
      updateData.completedAt = new Date()
    }

    const project = await prisma.sponsorshipProject.update({
      where: { id },
      data: updateData as never,
      include: {
        donations: {
          include: {
            donor: true,
            country: true,
          },
        },
      },
    })

    if (isCompleting && hasCompletionData && project.donations.length > 0) {
      for (const donation of project.donations) {
        if (!donation.reportSent) {
          try {
            await sendSponsorshipCompletionEmail({
              donorEmail: donation.donor.email,
              donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
              projectType: project.projectType,
              country: donation.country.country,
              images: data.completionImages || [],
              report: data.completionReport || "",
            })

            await prisma.sponsorshipDonation.update({
              where: { id: donation.id },
              data: { reportSent: true },
            })
          } catch (emailError) {
            console.error("Error sending completion email:", emailError)
          }
        }
      }
    }

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating sponsorship project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params
    await prisma.sponsorshipProject.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sponsorship project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
