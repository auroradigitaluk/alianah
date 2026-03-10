"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TABS = [
  { value: "all", label: "All" },
  { value: "offline", label: "Offline to Review" },
  { value: "insights", label: "Insights" },
  { value: "complete", label: "Complete" },
  { value: "custom", label: "Custom" },
] as const

export function FundraiserTabNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "all"
  const current = TABS.some((t) => t.value === tab) ? tab : "all"

  return (
    <Tabs value={current} className="w-full">
      <TabsList className="mb-4">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} asChild value={t.value}>
            <Link href={pathname + (t.value === "all" ? "" : `?tab=${t.value}`)} replace>
              {t.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
