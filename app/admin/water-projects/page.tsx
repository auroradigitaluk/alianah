import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { WaterProjectsTable } from "@/components/water-projects-table"
import { WaterProjectsStats } from "@/components/water-projects-stats"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"

async function getWaterProjects() {
  try {
    const projects = await prisma.waterProject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        donations: {
          select: {
            id: true,
            amountPence: true,
            status: true,
            donor: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            country: {
              select: {
                country: true,
                pricePence: true,
              },
            },
          },
        },
      },
    })

    // Get all countries for each project type
    const countries = await prisma.waterProjectCountry.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        projectType: true,
        country: true,
        pricePence: true,
      },
    })

    // Add countries to each project and include donation statuses
    return projects.map(project => ({
      ...project,
      availableCountries: countries.filter(c => c.projectType === project.projectType),
      donations: project.donations.map(d => ({
        ...d,
        status: (d as any).status, // Include status from donation
      })),
    }))
  } catch (error) {
    console.error("Error fetching water projects:", error)
    return []
  }
}

async function getWaterProjectsStats() {
  try {
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1) // January 1st of current year
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999) // December 31st of current year

    const projects = await prisma.waterProject.findMany({
      include: {
        donations: {
          select: {
            amountPence: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })

    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.isActive).length
    const totalDonations = projects.reduce((sum, p) => sum + (p.donations?.length || 0), 0)
    
    // Calculate total amount for current calendar year only
    const totalAmount = projects.reduce((sum, p) => {
      return sum + (p.donations?.reduce((dSum, d) => {
        const donationDate = new Date(d.createdAt)
        if (donationDate >= yearStart && donationDate <= yearEnd) {
          return dSum + d.amountPence
        }
        return dSum
      }, 0) || 0)
    }, 0)
    
    const completedDonations = projects.reduce((sum, p) => {
      return sum + (p.donations?.filter(d => d.status === "COMPLETE").length || 0)
    }, 0)
    
    const ongoingDonations = projects.reduce((sum, p) => {
      const ongoingStatuses = ["WAITING_TO_REVIEW", "ORDERED", "PENDING"]
      return sum + (p.donations?.filter(d => d.status && ongoingStatuses.includes(d.status)).length || 0)
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
    console.error("Error fetching water projects stats:", error)
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


export default async function WaterProjectsPage() {
  const projects = await getWaterProjects()
  const stats = await getWaterProjectsStats()

  return (
    <>
      <AdminHeader title="Water for Life" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold">Water Projects Overview</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">Comprehensive management system for all water projects</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/admin/water-projects/new">
                      <Button>
                        <IconPlus className="h-4 w-4 mr-2" />
                        New Project
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Statistics Overview */}
                <WaterProjectsStats stats={stats} />

                {/* Projects Table */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-base font-semibold">All Projects</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Manage and monitor all water project types</p>
                  </div>
                  {projects.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">No water projects yet</p>
                  ) : (
                    <WaterProjectsTable projects={projects} />
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
