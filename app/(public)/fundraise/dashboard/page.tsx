import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Plus, ExternalLink, LogOut } from "lucide-react"
import { FundraiserLogoutButton } from "@/components/fundraiser-logout-button"

export const dynamic = 'force-dynamic'

async function getFundraisers(email: string) {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      where: {
        email,
      },
      include: {
        appeal: {
          select: {
            title: true,
            slug: true,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return fundraisers.map((fundraiser) => {
      const totalRaised = fundraiser.donations.reduce(
        (sum, d) => sum + d.amountPence,
        0
      )
      const progressPercentage = fundraiser.targetAmountPence
        ? Math.min((totalRaised / fundraiser.targetAmountPence) * 100, 100)
        : 0

      return {
        ...fundraiser,
        totalRaised,
        progressPercentage,
        donationCount: fundraiser.donations.length,
      }
    })
  } catch (error) {
    console.error("Error fetching fundraisers:", error)
    return []
  }
}

async function getEligibleAppeals() {
  try {
    const appeals = await prisma.appeal.findMany({
      where: {
        isActive: true,
        allowFundraising: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
      },
      orderBy: {
        title: "asc",
      },
    })

    return appeals
  } catch (error) {
    console.error("Error fetching eligible appeals:", error)
    return []
  }
}

export default async function FundraiserDashboardPage() {
  const email = await getFundraiserEmail()

  if (!email) {
    redirect("/fundraise/login?redirect=/fundraise/dashboard")
  }

  const [fundraisers, eligibleAppeals] = await Promise.all([
    getFundraisers(email),
    getEligibleAppeals(),
  ])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Fundraisers</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage all your fundraising campaigns
            </p>
          </div>
          <FundraiserLogoutButton />
        </div>

        {/* Create New Fundraiser */}
        {eligibleAppeals.length > 0 && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle>Create New Fundraiser</CardTitle>
              <CardDescription>
                Choose a project to start fundraising for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {eligibleAppeals.map((appeal) => (
                  <Button
                    key={appeal.id}
                    asChild
                    variant="outline"
                    className="h-auto py-4 justify-start"
                  >
                    <Link href={`/fundraise/${appeal.slug}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <div className="font-medium">{appeal.title}</div>
                        {appeal.summary && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {appeal.summary}
                          </div>
                        )}
                      </div>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fundraisers List */}
        {fundraisers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't created any fundraisers yet.
              </p>
              {eligibleAppeals.length > 0 && (
                <Button asChild>
                  <Link href={`/fundraise/${eligibleAppeals[0].slug}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Fundraiser
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {fundraisers.map((fundraiser) => (
              <Card key={fundraiser.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg sm:text-xl">
                        {fundraiser.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        For {fundraiser.appeal.title}
                      </CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/fundraise/${fundraiser.slug}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Page
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Raised</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {formatCurrency(fundraiser.totalRaised)}
                      </p>
                    </div>
                    {fundraiser.targetAmountPence && (
                      <div>
                        <p className="text-sm text-muted-foreground">Target</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {formatCurrency(fundraiser.targetAmountPence)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {fundraiser.progressPercentage.toFixed(1)}% complete
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Donations</p>
                      <p className="text-xl sm:text-2xl font-bold mt-1">
                        {fundraiser.donationCount}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(fundraiser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
