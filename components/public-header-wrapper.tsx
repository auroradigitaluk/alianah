"use client"

import { usePathname } from "next/navigation"
import { PublicHeader } from "@/components/public-header"
import { FundraiserHeader } from "@/components/fundraiser-header"

export function PublicHeaderWrapper() {
  const pathname = usePathname()
  const isFundraiserPage = Boolean(pathname?.match(/^\/fundraise\/[^/]+$/))

  if (isFundraiserPage) {
    return <FundraiserHeader />
  }
  return <PublicHeader />
}
