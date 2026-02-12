"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"

const DONATE_SECTION_ID = "donate-section"

export function FundraiserFloatingDonateBar() {
  const [donationSectionVisible, setDonationSectionVisible] = React.useState(false)

  React.useEffect(() => {
    const el = document.getElementById(DONATE_SECTION_ID)
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setDonationSectionVisible(entry.isIntersecting)
      },
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scrollToDonate = () => {
    const el = document.getElementById(DONATE_SECTION_ID)
    el?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (donationSectionVisible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      aria-label="Scroll to donate"
    >
      <div className="rounded-xl border bg-card shadow-lg shadow-black/10">
        <Button
          type="button"
          onClick={scrollToDonate}
          className="w-full rounded-xl py-6 text-base font-semibold"
          size="lg"
        >
          <Heart className="mr-2 h-5 w-5 fill-current" />
          Donate now
        </Button>
      </div>
    </div>
  )
}

export { DONATE_SECTION_ID }
