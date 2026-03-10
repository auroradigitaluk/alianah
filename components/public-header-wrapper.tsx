"use client"

import { usePathname } from "next/navigation"
import { PublicHeader } from "@/components/public-header"
import { FundraiserHeader } from "@/components/fundraiser-header"

export function PublicHeaderWrapper() {
  const pathname = usePathname()
  // Fundraiser header: public campaign page (/fundraise/slug) or hub + create/login/dashboard (/fundraiser, /fundraiser/*)
  const isFundraiserPage =
    Boolean(pathname?.match(/^\/fundraise\/[^/]+$/)) || pathname?.startsWith("/fundraiser")

  if (isFundraiserPage) {
    return <FundraiserHeader />
  }
  return <PublicHeader />
}
