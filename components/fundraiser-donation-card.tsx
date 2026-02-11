"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { formatCurrency } from "@/lib/utils"
import { Share2, Heart, ShieldCheck } from "lucide-react"
import { DonationForm } from "@/components/donation-form"
import { WaterProjectDonationForm } from "@/components/water-project-donation-form"

type AppealProduct = {
  productId: string
  frequency: string
  presetAmountsPence: string
  allowCustom: boolean
  product: {
    id: string
    name: string
    type: string
    fixedAmountPence: number | null
    minAmountPence: number | null
    maxAmountPence: number | null
  }
}

type FundraiserDonationCardProps = {
  totalRaised: number
  targetAmountPence: number | null
  progressPercentage: number
  donationCount: number
  appeal?: {
    id: string
    title: string
    allowMonthly: boolean
    monthlyPricePence: number | null
    oneOffPresetAmountsPence?: string
    monthlyPresetAmountsPence?: string
    yearlyPresetAmountsPence?: string
  }
  products?: AppealProduct[]
  donationTypesEnabled?: string[]
  waterProject?: {
    id: string
    projectType: string
    plaqueAvailable?: boolean
  }
  fundraiserId: string
  recentDonations: Array<{
    amountPence: number
    donor: {
      firstName: string | null
      lastName?: string | null
    }
    isAnonymous?: boolean | null
    createdAt: Date
    timeAgo: string
  }>
}

export function FundraiserDonationCard({
  totalRaised,
  targetAmountPence,
  progressPercentage,
  donationCount,
  appeal,
  products,
  donationTypesEnabled,
  waterProject,
  fundraiserId,
  recentDonations,
}: FundraiserDonationCardProps) {
  const [copied, setCopied] = React.useState(false)

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Combined Progress Section and Donation Form */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Progress Section */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b">
            <ProgressRing
              value={progressPercentage}
              size={140}
              strokeWidth={10}
            >
              <div className="text-center max-w-[110px]">
                <p className="font-bold leading-tight text-[clamp(1rem,3vw,1.5rem)] break-words">
                  {formatCurrency(totalRaised)}
                </p>
                <p className="mt-1 text-[clamp(0.65rem,1.8vw,0.8rem)] font-normal text-muted-foreground">
                  raised of
                </p>
                <p className="text-[clamp(0.75rem,2.2vw,0.9rem)] font-semibold text-muted-foreground break-words">
                  {formatCurrency(targetAmountPence ?? 0)}
                </p>
              </div>
            </ProgressRing>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border w-full justify-center">
              <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="text-center min-w-0">
                <p className="text-xs font-semibold text-foreground">100% Donation Policy</p>
                <p className="text-xs text-muted-foreground">Every penny goes to the cause</p>
              </div>
            </div>
          </div>

          {/* Donation Form */}
          <div className="space-y-6">
            <h3 className="font-semibold text-sm">Donate</h3>
            {waterProject ? (
              <WaterProjectDonationForm
                projectId={waterProject.id}
                projectType={waterProject.projectType}
                plaqueAvailable={waterProject.plaqueAvailable}
                fundraiserId={fundraiserId}
              />
            ) : (
              appeal &&
              products &&
              donationTypesEnabled && (
                <DonationForm
                  appeal={appeal}
                  products={products}
                  donationTypesEnabled={donationTypesEnabled}
                  fundraiserId={fundraiserId}
                  noCard={true}
                />
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Secondary CTA */}
      <Button
        variant="outline"
        onClick={handleShare}
        className="w-full"
        size="lg"
      >
        <Share2 className="h-4 w-4" />
        {copied ? "Copied!" : "Share"}
      </Button>

      {/* Recent Donations */}
      {recentDonations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-sm">Recent donations</h3>
            <div className="space-y-3">
              {recentDonations.slice(0, 5).map((donation, index) => (
                <div key={index} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Heart className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {donation.isAnonymous
                          ? "Anonymous"
                          : [donation.donor.firstName, donation.donor.lastName]
                              .filter(Boolean)
                              .join(" ") || "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {donation.timeAgo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm">{formatCurrency(donation.amountPence)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
