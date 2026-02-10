import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { z } from "zod"
import { sendSponsorshipCompletionEmail } from "@/lib/email"

const completeWithPoolSchema = z.object({
  status: z.literal("COMPLETE"),
  usePoolReport: z.literal(true),
  googleDriveLink: z.string().url().optional().nullable(),
})

const completeWithGeneratedSchema = z.object({
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
  const [, err] = await requireAdminAuthSafe()
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json()

    const donation = await prisma.sponsorshipDonation.findUnique({
      where: { id },
      include: {
        donor: true,
        country: true,
        sponsorshipProject: true,
      },
    })

    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 })
    }

    const updatedDonation = await prisma.sponsorshipDonation.update({
      where: { id },
      data: {
        status: "COMPLETE",
        completedAt: new Date(),
      },
      include: {
        donor: true,
        country: true,
        sponsorshipProject: true,
      },
    })

    if (body.usePoolReport === true) {
      const data = completeWithPoolSchema.parse(body)
      const poolEntry = await prisma.sponsorshipReportPool.findFirst({
        where: {
          sponsorshipProjectId: donation.sponsorshipProjectId,
          assignedDonationId: null,
          assignedRecurringRef: null,
        },
        orderBy: { createdAt: "asc" },
      })
      if (!poolEntry) {
        return NextResponse.json(
          { error: "No report available in pool. Upload report PDFs to the project first." },
          { status: 400 }
        )
      }
      await prisma.sponsorshipReportPool.update({
        where: { id: poolEntry.id },
        data: { assignedDonationId: id },
      })
      try {
        await sendSponsorshipCompletionEmail({
          donorEmail: donation.donor.email,
          donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
          projectType: donation.sponsorshipProject.projectType,
          country: donation.country.country,
          images: [],
          report: "",
          completionReportPDF: poolEntry.pdfUrl,
          googleDriveLink: data.googleDriveLink || undefined,
        })
        await prisma.sponsorshipDonation.update({
          where: { id },
          data: { reportSent: true },
        })
      } catch (emailError) {
        console.error("Error sending sponsorship completion email:", emailError)
      }
      return NextResponse.json(updatedDonation)
    }

    const data = completeWithGeneratedSchema.parse(body)
    try {
      await sendSponsorshipCompletionEmail({
        donorEmail: donation.donor.email,
        donorName: `${donation.donor.firstName} ${donation.donor.lastName}`,
        projectType: donation.sponsorshipProject.projectType,
        country: donation.country.country,
        images: data.completionImages,
        report: data.completionReport || "",
        completionReportPDF: data.completionReportPDF || undefined,
        googleDriveLink: data.googleDriveLink || undefined,
      })
      await prisma.sponsorshipDonation.update({
        where: { id },
        data: { reportSent: true },
      })
    } catch (emailError) {
      console.error("Error sending sponsorship completion email:", emailError)
    }

    return NextResponse.json(updatedDonation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error completing sponsorship donation:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
