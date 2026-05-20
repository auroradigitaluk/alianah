import { prisma } from "@/lib/prisma"
import { displayChildCode } from "@/lib/sponsorship-report-pool"

export type SponsorshipProjectType = "ORPHANS" | "HIFZ" | "FAMILIES"

export async function getSponsorshipDonationsForAdmin(
  projectType: SponsorshipProjectType,
  staffId?: string | null
) {
  const project = await prisma.sponsorshipProject.findUnique({
    where: { projectType },
    include: {
      donations: {
        where: staffId ? { addedByAdminUserId: staffId } : undefined,
        include: {
          donor: {
            select: { title: true, firstName: true, lastName: true, email: true, phone: true },
          },
          country: { select: { country: true, pricePence: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!project) {
    return { projectId: null as string | null, donations: [] }
  }

  const donationIds = project.donations.map((d) => d.id)
  const poolAssignments =
    donationIds.length > 0
      ? await prisma.sponsorshipReportPool.findMany({
          where: {
            sponsorshipProjectId: project.id,
            assignedDonationId: { in: donationIds },
          },
          select: {
            id: true,
            assignedDonationId: true,
            childCode: true,
            fileName: true,
            pdfUrl: true,
          },
        })
      : []

  const poolByDonationId = new Map(
    poolAssignments
      .filter((p) => p.assignedDonationId)
      .map((p) => [p.assignedDonationId!, p])
  )

  return {
    projectId: project.id,
    donations: project.donations.map((d) => {
      const pool = poolByDonationId.get(d.id)
      return {
        id: d.id,
        amountPence: d.amountPence,
        donationType: d.donationType,
        paymentMethod: d.paymentMethod,
        giftAid: d.giftAid,
        emailSent: d.emailSent,
        reportSent: d.reportSent,
        donationNumber: d.donationNumber,
        notes: d.notes,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        completedAt: d.completedAt?.toISOString() ?? null,
        donor: d.donor,
        country: d.country,
        countryName: d.countryName,
        projectTypeSnapshot: d.projectTypeSnapshot,
        assignedChildCode: pool ? displayChildCode(pool) : null,
        assignedReportPdfUrl: pool?.pdfUrl ?? null,
        assignedPoolEntryId: pool?.id ?? null,
      }
    }),
  }
}
