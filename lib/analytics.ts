import { endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays } from "date-fns"

export type AnalyticsRange =
  | "last_7"
  | "last_30"
  | "this_week"
  | "this_month"
  | "this_year"
  | "custom"

export type AnalyticsInterval = "day" | "week" | "month" | "year"

type DateRangeInput = {
  range?: AnalyticsRange
  from?: string | null
  to?: string | null
}

export function resolveDateRange({ range, from, to }: DateRangeInput) {
  const now = new Date()
  const safeRange = range ?? "last_7"

  if (safeRange === "custom" && from && to) {
    const fromDate = startOfDay(new Date(from))
    const toDate = endOfDay(new Date(to))
    return { from: fromDate, to: toDate }
  }

  switch (safeRange) {
    case "last_30": {
      const fromDate = startOfDay(subDays(now, 29))
      const toDate = endOfDay(now)
      return { from: fromDate, to: toDate }
    }
    case "this_week": {
      const fromDate = startOfWeek(now, { weekStartsOn: 1 })
      const toDate = endOfWeek(now, { weekStartsOn: 1 })
      return { from: startOfDay(fromDate), to: endOfDay(toDate) }
    }
    case "this_month": {
      return { from: startOfDay(startOfMonth(now)), to: endOfDay(endOfMonth(now)) }
    }
    case "this_year": {
      return { from: startOfDay(startOfYear(now)), to: endOfDay(endOfYear(now)) }
    }
    case "last_7":
    default: {
      const fromDate = startOfDay(subDays(now, 6))
      const toDate = endOfDay(now)
      return { from: fromDate, to: toDate }
    }
  }
}

export function getBucketKey(date: Date, interval: AnalyticsInterval) {
  switch (interval) {
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10)
    case "month":
      return startOfMonth(date).toISOString().slice(0, 10)
    case "year":
      return startOfYear(date).toISOString().slice(0, 10)
    case "day":
    default:
      return startOfDay(date).toISOString().slice(0, 10)
  }
}

export function formatBucketLabel(bucketKey: string, interval: AnalyticsInterval) {
  if (interval === "month") {
    return bucketKey.slice(0, 7)
  }
  if (interval === "year") {
    return bucketKey.slice(0, 4)
  }
  return bucketKey
}

/** Exclude events whose referrer points at local development (common URL spellings). */
export const excludeLocalhostReferrer = {
  OR: [
    { referrer: null },
    {
      AND: [
        { referrer: { not: { contains: "localhost" } } },
        { referrer: { not: { contains: "127.0.0.1" } } },
        { referrer: { not: { contains: "0.0.0.0" } } },
      ],
    },
  ],
}

/** Pageviews that count toward public marketing / donation site analytics only. */
export const publicSitePageviewWhere = {
  AND: [
    excludeLocalhostReferrer,
    { path: { not: null } },
    { NOT: { path: { startsWith: "/admin" } } },
    { NOT: { path: { contains: "localhost" } } },
    { NOT: { path: { contains: "127.0.0.1" } } },
  ],
}

/** Client / drain ingest: skip recording pageviews for admin app or dev URLs in path. */
export function isPublicSiteAnalyticsPath(path: string | null | undefined): boolean {
  if (path == null || path.trim() === "") return false
  const p = path.trim().toLowerCase()
  if (p.startsWith("/admin")) return false
  if (p.includes("localhost") || p.includes("127.0.0.1") || p.includes("0.0.0.0")) return false
  return true
}

/** Referrer hostname label for breakdowns — skip local / internal referrers. */
export function isLocalOrInternalReferrerLabel(hostname: string): boolean {
  const h = hostname.trim().toLowerCase()
  if (h === "direct") return false
  if (h.includes("localhost") || h.includes("127.0.0.1") || h.includes("0.0.0.0")) return true
  if (h.endsWith(".local")) return true
  return false
}
