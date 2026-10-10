/** Split a full name from Apple Pay / Google Pay into first + last. */
export function splitPersonName(
  fullName: string | null | undefined,
): { firstName: string; lastName: string } | null {
  const parts = (fullName || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

export function isPlaceholderExpressName(firstName: string, lastName: string): boolean {
  return firstName === "Express" && lastName === "Donor"
}

type WalletBillingAddress = {
  line1?: string | null
  city?: string | null
  postal_code?: string | null
  country?: string | null
} | null

type WalletBillingDetails = {
  name?: string | null
  email?: string | null
  address?: WalletBillingAddress
} | null

/** Extract donor fields from a Stripe Payment Request `paymentmethod` event. */
export function donorDetailsFromPaymentRequestEvent(ev: {
  payerName?: string | null
  payerEmail?: string | null
  paymentMethod: {
    billing_details?: WalletBillingDetails
  }
}): {
  email: string | null
  firstName: string | null
  lastName: string | null
  address: string | null
  city: string | null
  postcode: string | null
  country: string | null
} {
  const bd = ev.paymentMethod.billing_details
  const email =
    (ev.payerEmail as string | undefined)?.trim() ||
    bd?.email?.trim() ||
    null
  const parsed = splitPersonName(
    (ev.payerName as string | undefined)?.trim() || bd?.name?.trim() || "",
  )
  const addr = bd?.address
  return {
    email,
    firstName: parsed?.firstName ?? null,
    lastName: parsed?.lastName ?? null,
    address: addr?.line1?.trim() || null,
    city: addr?.city?.trim() || null,
    postcode: addr?.postal_code?.trim() || null,
    country: addr?.country?.trim() || null,
  }
}

/** Extract a person name from Stripe PaymentIntent billing details. */
export function personNameFromStripeBilling(
  billingName: string | null | undefined,
): { firstName: string; lastName: string } | null {
  return splitPersonName(billingName)
}
