"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatCurrencyWhole } from "@/lib/utils"
import { Share2 } from "lucide-react"

const HERO_CARD_ID = "fundraiser-hero-card"

export type FundraiserStickyHeaderProps = {
  title: string
  totalRaised: number
  targetAmountPence: number | null
  progressPercentage: number
  donationCount: number
}

export function FundraiserStickyHeader({
  title,
  totalRaised,
  targetAmountPence,
  progressPercentage,
  donationCount,
}: FundraiserStickyHeaderProps) {
  const [cardInView, setCardInView] = React.useState(true)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    const el = document.getElementById(HERO_CARD_ID)
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setCardInView(entry.isIntersecting)
      },
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const scrollToDonate = () => {
    document.getElementById("donate-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (cardInView) return null

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 border-b border-neutral-200/80 dark:border-border bg-[#f5f5f5] dark:bg-card shadow-sm"
      aria-label="Campaign summary"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Left: title + nav */}
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-neutral-900 dark:text-foreground truncate text-base sm:text-lg">
              {title}
            </h2>
            <nav className="hidden md:flex items-center gap-4 mt-1 text-sm text-neutral-500 dark:text-muted-foreground" aria-label="Page sections">
              <button
                type="button"
                onClick={() => scrollTo("fundraiser-about")}
                className="hover:text-neutral-700 dark:hover:text-foreground transition-colors"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => scrollTo("fundraiser-donors")}
                className="hover:text-neutral-700 dark:hover:text-foreground transition-colors"
              >
                Donors
              </button>
              <button
                type="button"
                onClick={() => scrollTo("donate-section")}
                className="hover:text-neutral-700 dark:hover:text-foreground transition-colors"
              >
                Donate
              </button>
            </nav>
          </div>

          {/* Center: progress + supporters */}
          <div className="flex-shrink-0 w-full sm:w-[280px] lg:w-[320px] space-y-1.5">
            <Progress value={progressPercentage} className="h-2 bg-neutral-200 dark:bg-muted" />
            <p className="text-sm text-neutral-700 dark:text-muted-foreground tabular-nums">
              {donationCount} supporter{donationCount !== 1 ? "s" : ""}
              {targetAmountPence != null && (
                <span className="text-neutral-500 dark:text-muted-foreground">
                  {" "}
                  · {formatCurrencyWhole(totalRaised)} of {formatCurrencyWhole(targetAmountPence)}
                </span>
              )}
            </p>
          </div>

          {/* Right: Share + Donate */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="rounded-full border-neutral-300 dark:border-border bg-white dark:bg-input dark:border-input text-neutral-700 dark:text-foreground hover:bg-neutral-50 dark:hover:bg-accent"
            >
              <Share2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={scrollToDonate}
              className="rounded-full bg-primary text-primary-foreground hover:opacity-90"
            >
              Donate
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export { HERO_CARD_ID }
