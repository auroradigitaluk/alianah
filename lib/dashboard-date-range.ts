/**
 * Same date-range rules as the admin dashboard (`DashboardDateFilter` + dashboard page).
 * Default when `range` is omitted should be `"30d"` (caller responsibility).
 */
export function getDashboardDateRange(
  range: string | null,
  customStart?: string | null,
  customEnd?: string | null
) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (range === "custom" && customStart && customEnd) {
    const start = new Date(customStart + "T00:00:00")
    const end = new Date(customEnd + "T23:59:59.999")
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start.getTime() <= end.getTime()) {
      startDate = start
      endDate = end
      return { startDate, endDate }
    }
  }

  switch (range) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    case "yesterday": {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0)
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
      break
    }
    case "30d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case "all":
      startDate = new Date(0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    default:
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
  }

  return { startDate, endDate }
}
