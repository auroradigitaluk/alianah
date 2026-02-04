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
