"use client"

import * as React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const DONATE_SECTION_ID = "donate-section"

export function FundraiserHeader() {
  const [copied, setCopied] = React.useState(false)

  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDonate = () => {
    document.getElementById(DONATE_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Image
            src="/logo-light.png"
            alt="Alianah"
            width={24}
            height={24}
            className="h-6 w-6 object-contain dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt="Alianah"
            width={24}
            height={24}
            className="hidden h-6 w-6 object-contain dark:block"
          />
          <span className="text-foreground font-semibold">Alianah Humanity Welfare</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="hidden sm:inline-flex gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            {copied ? "Copied!" : "Share"}
          </Button>
          <Button type="button" size="sm" onClick={handleDonate}>
            Donate
          </Button>
        </div>
      </div>
    </header>
  )
}
