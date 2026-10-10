/** Preset monthly amounts in pence: £3, £5, £10, £20, £50, £100 */
export const MONTHLY_AMOUNT_PRESETS_PENCE = [300, 500, 1000, 2000, 5000, 10000] as const

const MIN_AMOUNT_POUNDS = 1
const MAX_AMOUNT_POUNDS = 10_000

/**
 * Parse a `/monthly/[amount]` path segment into whole pounds.
 * Accepts integers or simple decimals (e.g. "4", "17", "12.50").
 * Returns null when invalid.
 */
export function parseMonthlyAmountParam(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed || !/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const pounds = Number(trimmed)
  if (!Number.isFinite(pounds) || pounds < MIN_AMOUNT_POUNDS || pounds > MAX_AMOUNT_POUNDS) {
    return null
  }
  return pounds
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100)
}
