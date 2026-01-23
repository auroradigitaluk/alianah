import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export function formatDonorName(donor: { title?: string | null; firstName: string; lastName: string }): string {
  const parts = []
  if (donor.title) {
    parts.push(donor.title)
  }
  parts.push(donor.firstName, donor.lastName)
  return parts.join(" ")
}

// Payment method constants and utilities
export const PAYMENT_METHODS = {
  WEBSITE_STRIPE: "WEBSITE_STRIPE",
  CARD_SUMUP: "CARD_SUMUP",
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]

export function formatPaymentMethod(value: string): string {
  const mapping: Record<string, string> = {
    WEBSITE_STRIPE: "Website (Stripe)",
    CARD_SUMUP: "Card (SumUp)",
    CASH: "Cash",
    BANK_TRANSFER: "Bank Transfer",
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
