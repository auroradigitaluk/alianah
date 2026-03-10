"use client"

import * as React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrencyWhole } from "@/lib/utils"
import { Share2, Building2, CheckCircle2 } from "lucide-react"
import { DonationForm } from "@/components/donation-form"
import { FundraiserPublicCashForm } from "@/components/fundraiser-public-cash-form"
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
  campaignTitle?: string
  organizerName?: string
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
  waterProjectPresetCountry?: {
    id: string
    country: string
    pricePence: number
  }
  waterProjectPresetAmountPence?: number
  waterProjectPlaqueName?: string | null
  fundraiserId: string
  /** When true, stats render without a Card wrapper (for use inside a shared split card). */
  embedStatsInCard?: boolean
  /** When true, only the stats block is rendered (for split card). */
  statsOnly?: boolean
  /** When true, only the donation form and cash form are rendered (below split card). */
  formOnly?: boolean
}

export function FundraiserDonationCard({
  totalRaised,
  targetAmountPence,
  progressPercentage,
  donationCount,
  campaignTitle,
  organizerName,
  appeal,
  products,
  donationTypesEnabled,
  waterProject,
  waterProjectPresetCountry,
  waterProjectPresetAmountPence,
  waterProjectPlaqueName,
  fundraiserId,
  embedStatsInCard = false,
  statsOnly = false,
  formOnly = false,
}: FundraiserDonationCardProps) {
  const [copied, setCopied] = React.useState(false)
  const [displayAmount, setDisplayAmount] = React.useState(0)
  const donateSectionRef = React.useRef<HTMLDivElement>(null)
  const totalRaisedRef = React.useRef(totalRaised)
  const rafRef = React.useRef<number>(0)

  React.useEffect(() => {
    if (totalRaised === 0) {
      setDisplayAmount(0)
      return
    }
    totalRaisedRef.current = totalRaised
    const startValue = displayAmount
    const startTime = performance.now()
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5)

    const lastTenPoundsPence = 1000
    const hasSlowFinish = totalRaised > lastTenPoundsPence
    const phase1End = hasSlowFinish ? totalRaised - lastTenPoundsPence : totalRaised
    const phase1DurationMs = hasSlowFinish ? 1200 : 2000
    const phase2DurationMs = hasSlowFinish ? 3200 : 0
    const totalDurationMs = phase1DurationMs + phase2DurationMs

    const tick = (now: number) => {
      const elapsed = Math.min(now - startTime, totalDurationMs)
      let value: number
      if (!hasSlowFinish || elapsed < phase1DurationMs) {
        const t = phase1DurationMs > 0 ? Math.min(elapsed / phase1DurationMs, 1) : 1
        const eased = easeOutQuint(t)
        value = startValue + (phase1End - startValue) * eased
      } else {
        const t2 = (elapsed - phase1DurationMs) / phase2DurationMs
        const eased = easeOutQuint(Math.min(t2, 1))
        value = phase1End + (totalRaisedRef.current - phase1End) * eased
      }
      setDisplayAmount(Math.round(value))
      if (elapsed < totalDurationMs) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplayAmount(totalRaisedRef.current)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [totalRaised])

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const scrollToDonateForm = () => {
    if (statsOnly) {
      document.getElementById("donate-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      donateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const statsContent = (
    <div className="p-5 sm:p-6 flex flex-col space-y-5">
<div className="text-center space-y-2">
            <p className="text-4xl sm:text-5xl font-bold text-primary">
              {formatCurrencyWhole(displayAmount)}
            </p>
            <p className="text-sm text-neutral-600">
              raised of {formatCurrencyWhole(targetAmountPence ?? 0)} GBP goal
            </p>
          </div>

      <Progress value={progressPercentage} className="h-2 bg-neutral-100 dark:bg-muted" />

      <p className="text-sm text-neutral-600 dark:text-muted-foreground text-center">
        {donationCount} supporter{donationCount !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={handleShare}
          className="w-full h-12 rounded-lg border-neutral-300 dark:border-input text-neutral-700 dark:text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary text-base"
          size="lg"
        >
          <Share2 className="h-4 w-4 mr-2" />
          {copied ? "Copied!" : "Share"}
        </Button>
        <Button
          onClick={scrollToDonateForm}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-base"
          size="lg"
        >
          Donate
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 dark:text-muted-foreground">
        <span className="flex items-center gap-1.5 text-primary font-medium">
          <CheckCircle2 className="h-4 w-4" />
          100% Donation Policy
        </span>
      </div>

      <ul className="space-y-4 text-sm text-neutral-500 dark:text-muted-foreground border-t border-neutral-100 dark:border-border pt-6 mt-auto pb-1 text-center list-none pl-0">
        {campaignTitle && (
          <li className="flex items-center justify-center gap-2">
            <span className="text-neutral-400 dark:text-muted-foreground">Impact:</span>
            <span>{campaignTitle}</span>
          </li>
        )}
        <li className="flex items-center justify-center gap-2">
          <Image
            src="/logo-light.png"
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
          Alianah Humanity Welfare
        </li>
        <li className="flex items-center justify-center gap-2">
          <Building2 className="h-4 w-4 shrink-0" />
          Registered charity no. 1160076
        </li>
        <li className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          Verified for authenticity.
        </li>
      </ul>
    </div>
  )

  if (statsOnly) {
    return embedStatsInCard ? statsContent : (
      <Card className="border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">{statsContent}</CardContent>
      </Card>
    )
  }

  if (formOnly) {
    return (
      <div className="space-y-5 mt-6 sm:mt-8">
        <div ref={donateSectionRef}>
          <Card className="border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-5 sm:p-6">
              <div className="space-y-5">
                {waterProject ? (
                  <WaterProjectDonationForm
                  projectId={waterProject.id}
                  projectType={waterProject.projectType}
                  plaqueAvailable={waterProject.plaqueAvailable}
                  fundraiserId={fundraiserId}
                  presetCountry={waterProjectPresetCountry}
                  presetAmountPence={waterProjectPresetAmountPence}
                  presetPlaqueName={waterProjectPlaqueName ?? undefined}
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
                    variant="fundraiser"
                    campaignTitle={campaignTitle}
                    organizerName={organizerName}
                  />
                )
              )}
              </div>
            </CardContent>
          </Card>
        </div>
        <FundraiserPublicCashForm fundraiserId={fundraiserId} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats: either inside shared card (no wrapper) or own card */}
      {embedStatsInCard ? (
        statsContent
      ) : (
        <Card className="border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-0">{statsContent}</CardContent>
        </Card>
      )}

      {/* Donation form section - scroll target for Donate button */}
      <div ref={donateSectionRef} className="pt-1">
        <Card className="border border-neutral-200/80 dark:border-border bg-white dark:bg-card shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-6">
            {waterProject ? (
              <WaterProjectDonationForm
                projectId={waterProject.id}
                projectType={waterProject.projectType}
                plaqueAvailable={waterProject.plaqueAvailable}
                fundraiserId={fundraiserId}
                presetCountry={waterProjectPresetCountry}
                presetAmountPence={waterProjectPresetAmountPence}
                presetPlaqueName={waterProjectPlaqueName ?? undefined}
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
          </CardContent>
        </Card>
      </div>

      {/* Add offline donation (no login required) */}
      <FundraiserPublicCashForm fundraiserId={fundraiserId} />
    </div>
  )
}
