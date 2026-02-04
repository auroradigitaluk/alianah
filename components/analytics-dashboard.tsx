"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AnalyticsLineChart } from "@/components/analytics-line-chart"
import { AnalyticsRangeFilter, type AnalyticsIntervalValue, type AnalyticsRangeSelection, type AnalyticsRangeValue } from "@/components/analytics-range-filter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { resolveDateRange } from "@/lib/analytics"

type BreakdownItem = {
  label: string
  value: number
}

type AnalyticsResponse = {
  totals: {
    pageviews: number
    visitors: number
    sessions: number
    bounceRate?: number
    avgSessionDurationSeconds?: number
    avgPagesPerSession?: number
    checkoutSessions?: number
    completedOrders?: number
    conversionRate?: number
  }
  series: {
    date: string
    pageviews: number
    visitors: number
    sessions: number
  }[]
  topPages: BreakdownItem[]
  topReferrers: BreakdownItem[]
  trafficSources?: BreakdownItem[]
  entryPages?: BreakdownItem[]
  exitPages?: BreakdownItem[]
  countries: BreakdownItem[]
  devices: BreakdownItem[]
  os: BreakdownItem[]
  browsers: BreakdownItem[]
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return "< 1m"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function SummaryCard({
  title,
  value,
  format = "number",
}: {
  title: string
  value: number
  format?: "number" | "percent" | "duration" | "decimal"
}) {
  const display =
    format === "percent"
      ? `${value.toFixed(1)}%`
      : format === "duration"
        ? formatDuration(value)
        : format === "decimal"
          ? value.toFixed(1)
          : value.toLocaleString()
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{display}</div>
      </CardContent>
    </Card>
  )
}

const ITEMS_PER_PAGE = 5

function BreakdownCard({ title, items }: { title: string; items: BreakdownItem[] }) {
  const [page, setPage] = React.useState(0)
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1
  const visibleItems = items.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE)
  const hasPagination = items.length > ITEMS_PER_PAGE

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{item.label}</span>
                <span className="font-medium tabular-nums">{item.value.toLocaleString()}</span>
              </div>
            ))}
            {hasPagination && (
              <div className="mt-2 flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard() {
  const [selection, setSelection] = React.useState<AnalyticsRangeSelection>({
    range: "last_7",
    interval: "day",
  })
  const [data, setData] = React.useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [activeVisitors, setActiveVisitors] = React.useState<number>(0)

  React.useEffect(() => {
    const fetchRealtime = () => {
      fetch("/api/admin/analytics/realtime")
        .then((res) => res.json())
        .then((p) => setActiveVisitors(p.activeVisitors ?? 0))
        .catch(() => {})
    }
    fetchRealtime()
    const id = setInterval(fetchRealtime, 30_000)
    return () => clearInterval(id)
  }, [])

  React.useEffect(() => {
    if (selection.range === "custom" && (!selection.from || !selection.to)) {
      return
    }

    const { from, to } = resolveDateRange({
      range: selection.range,
      from: selection.from?.toISOString() ?? null,
      to: selection.to?.toISOString() ?? null,
    })

    const params = new URLSearchParams({
      range: selection.range,
      interval: selection.interval,
      from: from.toISOString(),
      to: to.toISOString(),
    })

    setLoading(true)
    setError(null)

    fetch(`/api/admin/analytics?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load analytics")
        return res.json()
      })
      .then((payload) => {
        if (payload?.error) {
          setError(payload.error as string)
          setData(null)
          return
        }
        setData(payload)
      })
      .catch((err) => {
        console.error(err)
        setError("Unable to load analytics data.")
      })
      .finally(() => setLoading(false))
  }, [selection])

  const totals = data?.totals ?? {
    pageviews: 0,
    visitors: 0,
    sessions: 0,
    bounceRate: 0,
    avgSessionDurationSeconds: 0,
    avgPagesPerSession: 0,
    checkoutSessions: 0,
    completedOrders: 0,
    conversionRate: 0,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Analytics</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Traffic overview from client-side tracking.
          </p>
        </div>
        <AnalyticsRangeFilter value={selection} onChange={setSelection} />
      </div>

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard title="Active now" value={activeVisitors} />
        <SummaryCard title="Pageviews" value={totals.pageviews} />
        <SummaryCard title="Visitors" value={totals.visitors} />
        <SummaryCard title="Sessions" value={totals.sessions} />
        <SummaryCard title="Bounce rate" value={totals.bounceRate ?? 0} format="percent" />
        <SummaryCard
          title="Avg session duration"
          value={totals.avgSessionDurationSeconds ?? 0}
          format="duration"
        />
        <SummaryCard
          title="Pages per session"
          value={totals.avgPagesPerSession ?? 0}
          format="decimal"
        />
        <SummaryCard title="Checkout sessions" value={totals.checkoutSessions ?? 0} />
        <SummaryCard title="Completed donations" value={totals.completedOrders ?? 0} />
        <SummaryCard
          title="Conversion rate"
          value={totals.conversionRate ?? 0}
          format="percent"
        />
      </div>

      <AnalyticsLineChart data={data?.series ?? []} />

      {loading && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Loading analytics…</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="Top Pages" items={data?.topPages ?? []} />
        <BreakdownCard
          title="Traffic Sources"
          items={data?.trafficSources ?? data?.topReferrers ?? []}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="Entry Pages" items={data?.entryPages ?? []} />
        <BreakdownCard title="Exit Pages" items={data?.exitPages ?? []} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="Countries" items={data?.countries ?? []} />
        <BreakdownCard title="Devices" items={data?.devices ?? []} />
        <BreakdownCard title="Browsers" items={data?.browsers ?? []} />
        <BreakdownCard title="Operating Systems" items={data?.os ?? []} />
      </div>
    </div>
  )
}
