"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { FundraiserLogoutButton } from "@/components/fundraiser-logout-button"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"

export function FundraiserHeader() {
  const [loggedIn, setLoggedIn] = React.useState<boolean | null>(null)
  const [copied, setCopied] = React.useState(false)
  const pathname = usePathname()

  const isFundraisePage = Boolean(pathname?.match(/^\/fundraise\/[^/]+$/))

  React.useEffect(() => {
    fetch("/api/fundraisers/me")
      .then((res) => res.json())
      .then((data: { email?: string | null }) => setLoggedIn(Boolean(data?.email)))
      .catch(() => setLoggedIn(false))
  }, [])

  const handleShare = () => {
    if (typeof window === "undefined") return
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDonateClick = () => {
    if (typeof document === "undefined") return
    document
      .getElementById("donate-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
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
        <div className="flex items-center gap-3">
          {loggedIn === true ? (
            <>
              <Link
                href="/fundraiser/dashboard"
                className="text-sm font-medium text-foreground hover:text-primary underline-offset-4 hover:underline hidden sm:inline"
              >
                Dashboard
              </Link>
              <Link
                href="/fundraiser/donations"
                className="text-sm font-medium text-foreground hover:text-primary underline-offset-4 hover:underline hidden sm:inline"
              >
                Donations
              </Link>
              {isFundraisePage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="hidden sm:inline-flex"
                >
                  <Share2 className="h-4 w-4 mr-1.5" />
                  {copied ? "Copied!" : "Share"}
                </Button>
              )}
              <FundraiserLogoutButton />
              <ThemeToggle />
            </>
          ) : (
            <>
              {isFundraisePage && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="hidden sm:inline-flex"
                  >
                    <Share2 className="h-4 w-4 mr-1.5" />
                    {copied ? "Copied!" : "Share"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleDonateClick}
                    className="hidden sm:inline-flex bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Donate
                  </Button>
                </>
              )}
              <ThemeToggle />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
