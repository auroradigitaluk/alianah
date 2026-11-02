/**
 * Client-safe Masjid helpers and constants. No Prisma/server imports, so these
 * can be used from client components. Server-only logic lives in `lib/masjid.ts`.
 */

/** Contribution presets (pence) shown on a masjid country page: £25, £50, £100, £250. */
export const MASJID_CONTRIBUTION_PRESETS_PENCE = [2500, 5000, 10000, 25000]

export const MASJID_DONATION_TYPES = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"] as const

/** Prefix on the backing appeal's slug so it never collides with a real appeal. */
export const MASJID_APPEAL_SLUG_PREFIX = "masjid-"

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** One-off preset amounts for the backing appeal: full masjid price + contributions. */
export function backingPresetAmountsPence(priceFromPence: number): string {
  const presets = [priceFromPence, ...MASJID_CONTRIBUTION_PRESETS_PENCE]
    .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
    .sort((a, b) => a - b)
  return JSON.stringify(presets)
}
