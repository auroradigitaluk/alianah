import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Capitalize first letter of each word as user types (after space or at start) */
export function toTitleCaseLive(input: string): string {
  return input.replace(/(^|\s+)([A-Za-z])/g, (_m, sep, letter) => `${sep}${letter.toUpperCase()}`)
}

/** Uppercase entire string (for postcodes) */
export function toUpperCaseLive(input: string): string {
  return input.toUpperCase()
}

/** Placeholder email used when no donor email is provided (e.g. offline donations). */
const OFFLINE_PLACEHOLDER_EMAIL_REGEX = /^offline-.+@alianahapp\.local$/

/** Returns true if the email is the system placeholder for "no email provided". */
export function isPlaceholderDonorEmail(email: string | null | undefined): boolean {
  return Boolean(email && OFFLINE_PLACEHOLDER_EMAIL_REGEX.test(email))
}

/** Display string for donor email; shows "—" when email is the offline placeholder. */
export function displayDonorEmail(email: string | null | undefined): string {
  if (!email) return "—"
  return isPlaceholderDonorEmail(email) ? "—" : email
}

/** Base URL for public fundraiser/donation links (e.g. give.alianah.org). No trailing slash. */
export function getFundraiserBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_FUNDRAISER_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  return raw.replace(/\/$/, "")
}

/** UK postcode validation */
export function isValidUkPostcode(postcode: string): boolean {
  const uk = /^([A-Z]{1,2}\d[A-Z\d]?)\s?(\d[A-Z]{2})$/i
  return uk.test(postcode.trim())
}

/** Postcode validation - UK or international */
export function isValidPostcode(input: string, country: string): boolean {
  const value = input.trim()
  if (!value) return false
  if (country === "GB" || country === "UK") return isValidUkPostcode(value)
  return /^[A-Za-z0-9][A-Za-z0-9\s-]{1,9}$/.test(value)
}

export function formatCurrency(amountPence: number): string {
  const amount = amountPence / 100
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatEnum(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export function formatDonorName(
  donor?: { title?: string | null; firstName: string; lastName: string } | null
): string {
  if (!donor) return "Unknown donor"
  const parts = []
  if (donor.title) {
    parts.push(donor.title)
  }
  parts.push(donor.firstName, donor.lastName)
  return parts.join(" ")
}

export function formatAdminUserName(
  addedBy?: { firstName?: string | null; lastName?: string | null; email?: string } | null
): string {
  if (!addedBy) return ""
  const name = [addedBy.firstName, addedBy.lastName].filter(Boolean).join(" ").trim()
  return name || "—"
}

// Payment method constants and utilities
export const PAYMENT_METHODS = {
  WEBSITE_STRIPE: "WEBSITE_STRIPE",
  CARD_SUMUP: "CARD_SUMUP",
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  OFFICE_BUCKETS: "OFFICE_BUCKETS",
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

export function formatPaymentMethod(value: string): string {
  const mapping: Record<string, string> = {
    WEBSITE_STRIPE: "Website (Stripe)",
    CARD_SUMUP: "Card (SumUp)",
    CASH: "Cash",
    BANK_TRANSFER: "Bank Transfer",
    OFFICE_BUCKETS: "Office Buckets",
    // Legacy values for backward compatibility
    STRIPE: "Website (Stripe)",
    CARD: "Card (SumUp)",
    PAYPAL: "Website (Stripe)", // Treat PayPal as website
    OTHER: "Other",
  }
  return mapping[value] || formatEnum(value)
}

// Collection source constants and utilities
export const COLLECTION_SOURCES = {
  WEBSITE: "website",
  OFFICE: "office",
  EVENTS: "events",
  COLLECTIONS: "collections",
  MASJID_COLLECTIONS: "masjid_collections",
  FUNDRAISING: "fundraising",
} as const

export type CollectionSource = typeof COLLECTION_SOURCES[keyof typeof COLLECTION_SOURCES]

export function formatCollectionSource(value: string): string {
  const mapping: Record<string, string> = {
    website: "Website",
    office: "Office",
    events: "Events",
    collections: "Collections",
    masjid_collections: "Masjid Collections",
    fundraising: "Fundraising",
  }
  return mapping[value] || formatEnum(value)
}
