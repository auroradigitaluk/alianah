"use client"

import * as React from "react"
import { AnalyticsLineChart } from "@/components/analytics-line-chart"
import { AnalyticsRangeFilter, type AnalyticsIntervalValue, type AnalyticsRangeSelection, type AnalyticsRangeValue } from "@/components/analytics-range-filter"
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
  }
  series: {
    date: string
    pageviews: number
    visitors: number
    sessions: number
  }[]
  topPages: BreakdownItem[]
  topReferrers: BreakdownItem[]
  countries: BreakdownItem[]
  devices: BreakdownItem[]
  os: BreakdownItem[]
  browsers: BreakdownItem[]
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  )
}

function BreakdownCard({ title, items }: { title: string; items: BreakdownItem[] }) {
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
            {items.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{item.label}</span>
                <span className="font-medium tabular-nums">{item.value.toLocaleString()}</span>
              </div>
            ))}
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
        setData(payload)
      })
      .catch((err) => {
        console.error(err)
        setError("Unable to load analytics data.")
      })
      .finally(() => setLoading(false))
  }, [selection])

  const totals = data?.totals ?? { pageviews: 0, visitors: 0, sessions: 0 }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Analytics</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Traffic overview from Vercel Web Analytics drains.
          </p>
        </div>
        <AnalyticsRangeFilter value={selection} onChange={setSelection} />
      </div>

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard title="Pageviews" value={totals.pageviews} />
        <SummaryCard title="Visitors" value={totals.visitors} />
        <SummaryCard title="Sessions" value={totals.sessions} />
      </div>

      <AnalyticsLineChart data={data?.series ?? []} />

      {loading && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">Loading analytics…</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="Top Pages" items={data?.topPages ?? []} />
        <BreakdownCard title="Top Referrers" items={data?.topReferrers ?? []} />
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
