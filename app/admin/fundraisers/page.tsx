import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { FundraisersTable } from "@/components/fundraisers-table"
import { ExportCsvButton } from "@/components/export-csv-button"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getFundraisers() {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        appeal: {
          select: {
            title: true,
          },
        },
        waterProject: {
          select: {
            projectType: true,
          },
        },
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amountPence: true,
          },
        },
        waterProjectDonations: {
          where: {
            status: {
              in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"],
            },
          },
          select: {
            amountPence: true,
          },
        },
      },
    })

    return fundraisers.map((fundraiser) => {
      const amountRaised = fundraiser.donations
        .concat(fundraiser.waterProjectDonations)
        .reduce(
        (sum, d) => sum + d.amountPence,
        0
      )
      const campaignTitle = fundraiser.appeal?.title
        ? fundraiser.appeal.title
        : fundraiser.waterProject?.projectType === "WATER_PUMP"
          ? "Water Pumps"
          : fundraiser.waterProject?.projectType === "WATER_WELL"
            ? "Water Wells"
            : fundraiser.waterProject?.projectType === "WATER_TANK"
              ? "Water Tanks"
              : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                ? "Wudhu Areas"
                : "Water Project"

      return {
        id: fundraiser.id,
        title: fundraiser.title,
        slug: fundraiser.slug,
        fundraiserName: fundraiser.fundraiserName,
        email: fundraiser.email,
        isActive: fundraiser.isActive,
        campaign: {
          title: campaignTitle,
          type: (fundraiser.appeal ? "APPEAL" : "WATER") as "APPEAL" | "WATER",
        },
        amountRaised,
      }
    })
  } catch (error) {
    return []
  }
}

export default async function FundraisersPage() {
  const fundraisers = await getFundraisers()

  return (
    <>
      <AdminHeader
        title="Fundraisers"
        actions={<ExportCsvButton variant="fundraisers" data={fundraisers} />}
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Fundraisers</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Manage fundraising campaigns</p>
                </div>
                <div>
                  <FundraisersTable fundraisers={fundraisers} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
