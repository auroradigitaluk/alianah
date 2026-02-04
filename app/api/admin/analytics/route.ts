import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatBucketLabel, getBucketKey, resolveDateRange, type AnalyticsInterval, type AnalyticsRange } from "@/lib/analytics"

type BreakdownItem = { label: string; value: number }

function toSortedBreakdown(map: Map<string, number>, limit = 10): BreakdownItem[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }))
}

function parseReferrer(referrer?: string | null) {
  if (!referrer) return "Direct"
  try {
    return new URL(referrer).hostname
  } catch {
    return referrer
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get("range") as AnalyticsRange | null
    const intervalParam = (searchParams.get("interval") as AnalyticsInterval | null) ?? "day"
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    const { from, to } = resolveDateRange({
      range: rangeParam ?? undefined,
      from: fromParam,
      to: toParam,
    })

    const events = await prisma.analyticsEvent.findMany({
      where: {
        eventType: "pageview",
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      select: {
        timestamp: true,
        path: true,
        referrer: true,
        country: true,
        deviceType: true,
        osName: true,
        clientName: true,
        sessionId: true,
        deviceId: true,
      },
    })

  const visitorsSet = new Set<number>()
  const sessionsSet = new Set<number>()

  const pageMap = new Map<string, number>()
  const referrerMap = new Map<string, number>()
  const countryMap = new Map<string, number>()
  const deviceMap = new Map<string, number>()
  const osMap = new Map<string, number>()
  const browserMap = new Map<string, number>()
  const entryPageMap = new Map<string, number>()
  const exitPageMap = new Map<string, number>()

  const seriesMap = new Map<
    string,
    { pageviews: number; sessions: Set<number>; visitors: Set<number> }
  >()

  // Per-session: first event, last event, count, duration
  const sessionData = new Map<
    number,
    { first: { path: string; ts: Date }; last: { path: string; ts: Date }; count: number }
  >()

  const sortedEvents = [...events].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  for (const event of sortedEvents) {
    if (typeof event.deviceId === "number") visitorsSet.add(event.deviceId)
    if (typeof event.sessionId === "number") sessionsSet.add(event.sessionId)

    const pathKey = event.path || "Unknown"
    pageMap.set(pathKey, (pageMap.get(pathKey) ?? 0) + 1)

    const refKey = parseReferrer(event.referrer)
    referrerMap.set(refKey, (referrerMap.get(refKey) ?? 0) + 1)

    const countryKey = event.country || "Unknown"
    countryMap.set(countryKey, (countryMap.get(countryKey) ?? 0) + 1)

    const deviceKey = event.deviceType || "Unknown"
    deviceMap.set(deviceKey, (deviceMap.get(deviceKey) ?? 0) + 1)

    const osKey = event.osName || "Unknown"
    osMap.set(osKey, (osMap.get(osKey) ?? 0) + 1)

    const browserKey = event.clientName || "Unknown"
    browserMap.set(browserKey, (browserMap.get(browserKey) ?? 0) + 1)

    const bucketKey = getBucketKey(event.timestamp, intervalParam)
    const bucket = seriesMap.get(bucketKey) ?? {
      pageviews: 0,
      sessions: new Set<number>(),
      visitors: new Set<number>(),
    }

    bucket.pageviews += 1
    if (typeof event.sessionId === "number") bucket.sessions.add(event.sessionId)
    if (typeof event.deviceId === "number") bucket.visitors.add(event.deviceId)
    seriesMap.set(bucketKey, bucket)

    if (typeof event.sessionId === "number") {
      const pathKey = event.path || "Unknown"
      const existing = sessionData.get(event.sessionId)
      if (!existing) {
        sessionData.set(event.sessionId, {
          first: { path: pathKey, ts: event.timestamp },
          last: { path: pathKey, ts: event.timestamp },
          count: 1,
        })
      } else {
        existing.last = { path: pathKey, ts: event.timestamp }
        existing.count += 1
      }
    }
  }

  const sessionCount = sessionData.size
  let bounceCount = 0
  let totalDurationMs = 0
  for (const s of sessionData.values()) {
    if (s.count === 1) bounceCount++
    totalDurationMs += s.last.ts.getTime() - s.first.ts.getTime()
    const entryPath = s.first.path
    const exitPath = s.last.path
    entryPageMap.set(entryPath, (entryPageMap.get(entryPath) ?? 0) + 1)
    exitPageMap.set(exitPath, (exitPageMap.get(exitPath) ?? 0) + 1)
  }

  const bounceRate = sessionCount > 0 ? (bounceCount / sessionCount) * 100 : 0
  const avgSessionDurationSeconds =
    sessionCount > 0 ? Math.round(totalDurationMs / 1000 / sessionCount) : 0
  const avgPagesPerSession =
    sessionCount > 0 ? events.length / sessionCount : 0

  // Conversion metrics: checkout sessions + completed orders
  const checkoutSessionIds = new Set<number>()
  for (const event of events) {
    const path = event.path || ""
    if (path === "/checkout" || path.startsWith("/checkout?")) {
      if (typeof event.sessionId === "number") checkoutSessionIds.add(event.sessionId)
    }
  }
  const checkoutSessions = checkoutSessionIds.size

  const completedOrders = await prisma.demoOrder.count({
    where: {
      status: "COMPLETED",
      createdAt: { gte: from, lte: to },
    },
  })

  const conversionRate =
    checkoutSessions > 0 ? (completedOrders / checkoutSessions) * 100 : 0

  const series = Array.from(seriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucketKey, bucket]) => ({
      date: formatBucketLabel(bucketKey, intervalParam),
      pageviews: bucket.pageviews,
      visitors: bucket.visitors.size,
      sessions: bucket.sessions.size,
    }))

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString(), interval: intervalParam },
      totals: {
        pageviews: events.length,
        visitors: visitorsSet.size,
        sessions: sessionsSet.size,
        bounceRate,
        avgSessionDurationSeconds,
        avgPagesPerSession,
        checkoutSessions,
        completedOrders,
        conversionRate,
      },
      series,
      topPages: toSortedBreakdown(pageMap, 10),
      topReferrers: toSortedBreakdown(referrerMap, 10),
      trafficSources: toSortedBreakdown(referrerMap, 10),
      entryPages: toSortedBreakdown(entryPageMap, 10),
      exitPages: toSortedBreakdown(exitPageMap, 10),
      countries: toSortedBreakdown(countryMap, 10),
      devices: toSortedBreakdown(deviceMap, 10),
      os: toSortedBreakdown(osMap, 10),
      browsers: toSortedBreakdown(browserMap, 10),
    })
  } catch (error) {
    console.error("Analytics query failed:", error)
    return NextResponse.json(
      {
        error: "Analytics data is unavailable. Ensure migrations ran in this environment.",
        totals: {
          pageviews: 0,
          visitors: 0,
          sessions: 0,
          bounceRate: 0,
          avgSessionDurationSeconds: 0,
          avgPagesPerSession: 0,
          checkoutSessions: 0,
          completedOrders: 0,
          conversionRate: 0,
        },
        series: [],
        topPages: [],
        topReferrers: [],
        trafficSources: [],
        entryPages: [],
        exitPages: [],
        countries: [],
        devices: [],
        os: [],
        browsers: [],
      },
      { status: 200 }
    )
  }
}
