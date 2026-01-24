"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Plus, ExternalLink } from "lucide-react"
import { FundraiserLogoutButton } from "@/components/fundraiser-logout-button"
import { FundraiserDonationsView } from "@/components/fundraiser-donations-view"

interface Fundraiser {
  id: string
  title: string
  slug: string
  totalRaised: number
  targetAmountPence: number | null
  progressPercentage: number
  donationCount: number
  createdAt: Date
  appeal: {
    title: string
    slug: string
  }
}

interface EligibleAppeal {
  id: string
  title: string
  slug: string
  summary: string | null
}

interface FundraiserDashboardClientProps {
  fundraisers: Fundraiser[]
  eligibleAppeals: EligibleAppeal[]
}

export function FundraiserDashboardClient({
  fundraisers,
  eligibleAppeals,
}: FundraiserDashboardClientProps) {
  const [selectedFundraiserId, setSelectedFundraiserId] = useState<string | null>(null)
  const [selectedFundraiserTitle, setSelectedFundraiserTitle] = useState<string>("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleFundraiserClick = (fundraiser: Fundraiser) => {
    setSelectedFundraiserId(fundraiser.id)
    setSelectedFundraiserTitle(fundraiser.title)
    setSidebarOpen(true)
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                My Fundraisers
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Manage all your fundraising campaigns
              </p>
            </div>
            <FundraiserLogoutButton />
          </div>

          {/* Create New Fundraiser */}
          {eligibleAppeals.length > 0 && (
            <Card className="mb-6 sm:mb-8 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Create New Fundraiser</CardTitle>
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
                      className="h-auto py-4 justify-start hover:bg-primary/5 hover:border-primary/30 transition-all"
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
                  You haven&apos;t created any fundraisers yet.
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
                <Card
                  key={fundraiser.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-card via-card to-primary/5"
                  onClick={() => handleFundraiserClick(fundraiser)}
                >
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
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Link href={`/fundraise/${fundraiser.slug}`} target="_blank">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Page
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Raised</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1 text-primary">
                          {formatCurrency(fundraiser.totalRaised)}
                        </p>
                      </div>
                      {fundraiser.targetAmountPence && (
                        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Target</p>
                          <p className="text-xl sm:text-2xl font-bold mt-1">
                            {formatCurrency(fundraiser.targetAmountPence)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {fundraiser.progressPercentage.toFixed(1)}% complete
                          </p>
                        </div>
                      )}
                      <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Donations</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">
                          {fundraiser.donationCount}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(fundraiser.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-primary mt-1 font-medium">
                        Click to view all donations →
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <FundraiserDonationsView
        fundraiserId={selectedFundraiserId}
        fundraiserTitle={selectedFundraiserTitle}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
    </>
  )
}
