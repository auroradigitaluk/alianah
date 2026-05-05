"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Beef } from "lucide-react"

const SIZE_LABELS: Record<"ONE_SEVENTH" | "SMALL" | "LARGE", string> = {
  ONE_SEVENTH: "1/7th",
  SMALL: "Small",
  LARGE: "Large",
}

const SIZE_ORDER: Array<keyof typeof SIZE_LABELS> = ["ONE_SEVENTH", "SMALL", "LARGE"]

type YearStatsPayload = {
  year: number
  grandTotalPence: number
  countries: Array<{
    id: string
    country: string
    totalPence: number
    donationCount: number
    bySize: Record<
      "ONE_SEVENTH" | "SMALL" | "LARGE",
      { totalPence: number; count: number }
    >
  }>
}

export function QurbaniYearStatsCards() {
  const [data, setData] = useState<YearStatsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/qurbani/year-stats")
        if (!res.ok) throw new Error("failed")
        const json = (await res.json()) as YearStatsPayload
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden border-muted">
            <CardHeader className="pb-2 space-y-0">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data || data.countries.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">This year ({data.year})</p>
        <p className="text-xs text-muted-foreground">
          Total all countries:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatCurrency(data.grandTotalPence)}
          </span>
        </p>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.countries.map((c) => (
          <Card
            key={c.id}
            className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-primary/5 to-card"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium leading-snug line-clamp-2 pr-2">{c.country}</CardTitle>
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Beef className="h-4 w-4 text-primary" aria-hidden />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-2">
              <div className="text-2xl font-bold tabular-nums">{formatCurrency(c.totalPence)}</div>
              <p className="text-xs text-muted-foreground">
                {c.donationCount === 0
                  ? "No donations yet"
                  : `${c.donationCount} donation${c.donationCount === 1 ? "" : "s"}`}
              </p>
              {c.donationCount > 0 && c.bySize && (
                <div className="border-t border-primary/15 pt-2 space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    By size
                  </p>
                  <ul className="space-y-1 text-xs">
                    {SIZE_ORDER.map((size) => {
                      const row = c.bySize[size]
                      return (
                        <li
                          key={size}
                          className="flex justify-between gap-3 tabular-nums text-muted-foreground"
                        >
                          <span className="text-foreground/90">{SIZE_LABELS[size]}</span>
                          <span className="text-right shrink-0">
                            {formatCurrency(row.totalPence)}
                            <span className="text-muted-foreground">
                              {" "}
                              · {row.count} donation{row.count === 1 ? "" : "s"}
                            </span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
