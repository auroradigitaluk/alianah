import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendWaterProjectCompletionEmail } from "@/lib/email"

const completeDonationSchema = z.object({
  status: z.literal("COMPLETE"),
  completionImages: z.array(z.string()).length(4, "Exactly 4 images are required"),
  completionReport: z.string().optional(),
  completionReportPDF: z.string().url().optional().nullable(),
  googleDriveLink: z.string().url().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = completeDonationSchema.parse(body)

    // Get donation with relations
    const donation = await prisma.waterProjectDonation.findUnique({
      where: { id },
      include: {
        donor: true,
        country: true,
        waterProject: true,
      },
    })

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    }

    // Update donation status
    const updatedDonation = await prisma.waterProjectDonation.update({
      where: { id },
      data: {
        status: "COMPLETE",
        completedAt: new Date(),
      },
      include: {
        donor: true,
        country: true,
        waterProject: true,
      },
    })

    // Send completion email
    try {
      await sendWaterProjectCompletionEmail({
        donorEmail: donation.donor.email,
        donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
        projectType: donation.waterProject.projectType,
        country: donation.country.country,
        images: data.completionImages,
        report: data.completionReport || "",
        completionReportPDF: data.completionReportPDF || undefined,
        googleDriveLink: data.googleDriveLink || undefined,
      })

      // Mark report as sent
      await prisma.waterProjectDonation.update({
        where: { id },
        data: { reportSent: true },
      })
    } catch (emailError) {
      console.error("Error sending completion email:", emailError)
      // Don't fail the completion if email fails
    }

    return NextResponse.json(updatedDonation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error completing donation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
