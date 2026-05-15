import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"
import {
  formatCurrency,
  formatDateTime,
  formatEnum,
  formatPaymentMethod,
  displayDonorEmail,
} from "@/lib/utils"
import { getQurbaniDonationChannel, getQurbaniDonationChannelLabel, type QurbaniDonationChannel } from "@/lib/qurbani-donation-source"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SIZE_LABELS: Record<string, string> = {
  ONE_SEVENTH: "1/7th",
  SMALL: "Small",
  LARGE: "Large",
}

const INCLUDE_GROUPS = [
  "donor",
  "donor_address",
  "billing",
  "payment",
  "giftaid",
  "notes",
  "fundraiser",
  "office",
] as const

type IncludeGroup = (typeof INCLUDE_GROUPS)[number]

function isIncludeGroup(s: string): s is IncludeGroup {
  return (INCLUDE_GROUPS as readonly string[]).includes(s)
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function parseDateRange(request: NextRequest): { from: Date; to: Date } | null {
  const fromStr = request.nextUrl.searchParams.get("from")
  const toStr = request.nextUrl.searchParams.get("to")
  if (!fromStr || !toStr) return null
  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return { from, to }
}

function parseInclude(searchParams: URLSearchParams): Set<IncludeGroup> {
  const raw = searchParams.get("include")
  /** Legacy: omit param = full export. Explicit empty string = core columns only. */
  if (raw === null) return new Set(INCLUDE_GROUPS)
  if (raw.trim() === "") return new Set()
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(isIncludeGroup)
  return new Set(parts)
}

function parseSources(searchParams: URLSearchParams): Set<QurbaniDonationChannel> | null {
  const raw = searchParams.get("sources")
  if (!raw?.trim()) return null
  const allowed: QurbaniDonationChannel[] = ["website", "offline", "fundraiser"]
  const found = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is QurbaniDonationChannel => (allowed as readonly string[]).includes(s))
  return found.length ? new Set(found) : null
}

export async function GET(request: NextRequest) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err

  const range = parseDateRange(request)
  if (!range) {
    return NextResponse.json(
      { error: "Query params 'from' and 'to' (ISO dates) are required" },
      { status: 400 }
    )
  }

  const { from, to } = range
  const include = parseInclude(request.nextUrl.searchParams)
  const sourcesFilter = parseSources(request.nextUrl.searchParams)

  const countryIdsRaw = request.nextUrl.searchParams.get("countryIds")
  const countryIds =
    countryIdsRaw
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? []

  const rows = await prisma.qurbaniDonation.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      ...(countryIds.length ? { qurbaniCountryId: { in: countryIds } } : {}),
    },
    include: {
      donor: true,
      qurbaniCountry: true,
      fundraiser: {
        select: { fundraiserName: true, title: true, slug: true },
      },
      addedBy: {
        select: { email: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })

  const filtered = rows.filter((row) => {
    const channel = getQurbaniDonationChannel(row)
    if (sourcesFilter && !sourcesFilter.has(channel)) return false
    return true
  })

  type RowOut = Record<string, string>
  const headers: string[] = []
  const keys: (keyof RowOut | string)[] = []

  const add = (key: string, header: string, group: "core" | IncludeGroup) => {
    if (group !== "core" && !include.has(group)) return
    keys.push(key)
    headers.push(header)
  }

  add("createdAt", "Created", "core")
  add("donationNumber", "Donation ref", "core")
  add("country", "Country", "core")
  add("size", "Size", "core")
  add("amountGbp", "Amount", "core")
  add("donationType", "Donation type", "core")
  add("source", "Source", "core")

  add("donorFirstName", "Donor first name", "donor")
  add("donorLastName", "Donor last name", "donor")
  add("donorEmail", "Donor email", "donor")
  add("donorPhone", "Donor phone", "donor")

  add("donorAddress", "Donor address", "donor_address")
  add("donorCity", "Donor city", "donor_address")
  add("donorPostcode", "Donor postcode", "donor_address")
  add("donorCountry", "Donor country", "donor_address")

  add("billingAddress", "Billing address", "billing")
  add("billingCity", "Billing city", "billing")
  add("billingPostcode", "Billing postcode", "billing")
  add("billingCountry", "Billing country", "billing")

  add("paymentMethod", "Payment method", "payment")
  add("collectedVia", "Collected via", "payment")
  add("transactionId", "Transaction ID", "payment")

  add("giftAid", "Gift Aid", "giftaid")
  add("giftAidClaimed", "Gift Aid claimed", "giftaid")

  add("isAnonymous", "Anonymous", "notes")
  add("qurbaniNames", "Qurbani names", "notes")
  add("notes", "Notes", "notes")

  add("fundraiserName", "Fundraiser name", "fundraiser")
  add("fundraiserTitle", "Fundraiser title", "fundraiser")
  add("fundraiserSlug", "Fundraiser slug", "fundraiser")

  add("addedBy", "Added by (office)", "office")

  const dataRows: RowOut[] = filtered.map((d) => {
    const channel = getQurbaniDonationChannel(d)
    const out: RowOut = {
      createdAt: formatDateTime(d.createdAt),
      donationNumber: d.donationNumber ?? "",
      country: d.qurbaniCountry.country,
      size: SIZE_LABELS[d.size] ?? d.size,
      amountGbp: formatCurrency(d.amountPence),
      donationType: formatEnum(d.donationType),
      source: getQurbaniDonationChannelLabel(channel),

      donorFirstName: d.donor.firstName,
      donorLastName: d.donor.lastName,
      donorEmail: displayDonorEmail(d.donor.email),
      donorPhone: d.donor.phone ?? "",

      donorAddress: d.donor.address ?? "",
      donorCity: d.donor.city ?? "",
      donorPostcode: d.donor.postcode ?? "",
      donorCountry: d.donor.country ?? "",

      billingAddress: d.billingAddress ?? "",
      billingCity: d.billingCity ?? "",
      billingPostcode: d.billingPostcode ?? "",
      billingCountry: d.billingCountry ?? "",

      paymentMethod: formatPaymentMethod(d.paymentMethod),
      collectedVia: d.collectedVia ? formatEnum(d.collectedVia) : "",
      transactionId: d.transactionId ?? "",

      giftAid: d.giftAid ? "Yes" : "No",
      giftAidClaimed: d.giftAidClaimed ? "Yes" : "No",

      isAnonymous: d.isAnonymous ? "Yes" : "No",
      qurbaniNames: d.qurbaniNames ?? "",
      notes: d.notes ?? "",

      fundraiserName: d.fundraiser?.fundraiserName ?? "",
      fundraiserTitle: d.fundraiser?.title ?? "",
      fundraiserSlug: d.fundraiser?.slug ?? "",

      addedBy: d.addedBy
        ? [d.addedBy.firstName, d.addedBy.lastName].filter(Boolean).join(" ").trim() || d.addedBy.email
        : "",
    }
    return out
  })

  const csvLines = [
    headers.map(csvEscape).join(","),
    ...dataRows.map((row) => keys.map((k) => csvEscape(row[k as keyof RowOut] ?? "")).join(",")),
  ]

  const filename = `qurbani-donations-${from.toISOString().slice(0, 10)}--${to.toISOString().slice(0, 10)}.csv`

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
