import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { FundraisersTable } from "@/components/fundraisers-table"

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
        donations: {
          where: {
            status: "COMPLETED",
          },
          select: {
            amountPence: true,
          },
        },
      },
    })

    return fundraisers.map((fundraiser) => {
      const amountRaised = fundraiser.donations.reduce(
        (sum, d) => sum + d.amountPence,
        0
      )

      return {
        id: fundraiser.id,
        title: fundraiser.title,
        slug: fundraiser.slug,
        fundraiserName: fundraiser.fundraiserName,
        email: fundraiser.email,
        isActive: fundraiser.isActive,
        appeal: {
          title: fundraiser.appeal.title,
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
      <AdminHeader title="Fundraisers" />
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
