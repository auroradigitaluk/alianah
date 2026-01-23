import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { SponsorshipProjectsTable } from "@/components/sponsorship-projects-table"
import { SponsorshipProjectsStats } from "@/components/sponsorship-projects-stats"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getSponsorshipProjects() {
  try {
    const projects = await prisma.sponsorshipProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        donations: {
          select: {
            id: true,
            amountPence: true,
            status: true,
            donor: {
              select: { firstName: true, lastName: true, email: true },
            },
            country: {
              select: { country: true, pricePence: true },
            },
          },
        },
      },
    })

    const countries = await prisma.sponsorshipProjectCountry.findMany({
      where: { isActive: true },
      select: { id: true, projectType: true, country: true, pricePence: true },
    })

    return projects.map((project) => ({
      ...project,
      availableCountries: countries.filter((c) => c.projectType === project.projectType),
      donations: project.donations,
    }))
  } catch (error) {
    console.error("Error fetching sponsorship projects:", error)
    return []
  }
}

async function getSponsorshipProjectsStats() {
  try {
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    const projects = await prisma.sponsorshipProject.findMany({
      include: {
        donations: {
          select: { amountPence: true, status: true, createdAt: true },
        },
      },
    })

    const totalProjects = projects.length
    const activeProjects = projects.filter((p) => p.isActive).length
    const totalDonations = projects.reduce((sum, p) => sum + (p.donations?.length || 0), 0)

    const totalAmount = projects.reduce((sum, p) => {
      return (
        sum +
        (p.donations?.reduce((dSum, d) => {
          const donationDate = new Date(d.createdAt)
          if (donationDate >= yearStart && donationDate <= yearEnd) return dSum + d.amountPence
          return dSum
        }, 0) || 0)
      )
    }, 0)

    const completedDonations = projects.reduce(
      (sum, p) => sum + (p.donations?.filter((d) => d.status === "COMPLETE").length || 0),
      0
    )
    const ongoingDonations = projects.reduce((sum, p) => {
      const ongoing = ["WAITING_TO_REVIEW", "ORDERED", "PENDING"]
      return sum + (p.donations?.filter((d) => d.status && ongoing.includes(d.status)).length || 0)
    }, 0)

    return {
      totalProjects,
      totalDonations,
      totalAmount,
      completedDonations,
      ongoingDonations,
      activeProjects,
    }
  } catch (error) {
    console.error("Error fetching sponsorship stats:", error)
    return {
      totalProjects: 0,
      totalDonations: 0,
      totalAmount: 0,
      completedDonations: 0,
      ongoingDonations: 0,
      activeProjects: 0,
    }
  }
}

export default async function SponsorshipsPage() {
  const projects = await getSponsorshipProjects()
  const stats = await getSponsorshipProjectsStats()

  return (
    <>
      <AdminHeader title="Sponsorships" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Sponsorship Projects Overview</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Manage Orphans, Hifz, and Families sponsorship programmes
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/admin/sponsorships/new">
                      <Button>
                        <IconPlus className="h-4 w-4 mr-2" />
                        New Project
                      </Button>
                    </Link>
                  </div>
                </div>

                <SponsorshipProjectsStats stats={stats} />

                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold">All Projects</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Manage and monitor Orphans, Hifz, and Families
                    </p>
                  </div>
                  {projects.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No sponsorship projects yet</p>
                  ) : (
                    <SponsorshipProjectsTable projects={projects} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
