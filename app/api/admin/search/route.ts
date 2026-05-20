import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminAuthSafe } from "@/lib/admin-auth"
import { formatCurrency } from "@/lib/utils"
import { getQurbaniCheckoutGroupKey, orderNumberFromNotes } from "@/lib/qurbani-checkout"

export const dynamic = "force-dynamic"

const LIMIT = 6
const contains = (q: string) => ({ contains: q, mode: "insensitive" } as const)

export type SearchResultItem = {
  type: string
  id: string
  label: string
  subtitle?: string
  url: string
}

export async function GET(request: NextRequest) {
  const [user, err] = await requireAdminAuthSafe()
  if (err) return err
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const staffFilter =
    user.role === "STAFF" ? { addedByAdminUserId: user.id } as const : undefined

  try {
    const [
      donors,
      donations,
      checkoutOrders,
      qurbaniCheckouts,
      appeals,
      fundraisers,
      masjids,
      adminUsers,
      collections,
      offlineIncome,
      recurring,
      waterProjects,
      sponsorships,
      tasks,
    ] = await Promise.all([
      prisma.donor
        .findMany({
          where: {
            OR: [
              { firstName: contains(q) },
              { lastName: contains(q) },
              { email: contains(q) },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true, firstName: true, lastName: true, email: true },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((d) => ({
            type: "donor",
            id: d.id,
            label: [d.firstName, d.lastName].filter(Boolean).join(" "),
            subtitle: d.email,
            url: "/admin/donors",
          }))
        ),

      prisma.donation
        .findMany({
          where: {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { transactionId: { contains: q, mode: "insensitive" } },
              { id: q },
              { billingAddress: contains(q) },
              { billingCity: contains(q) },
              { billingPostcode: contains(q) },
            ],
          },
          select: {
            id: true,
            orderNumber: true,
            amountPence: true,
            transactionId: true,
            donor: { select: { firstName: true, lastName: true } },
          },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((d) => ({
            type: "donation",
            id: d.id,
            label: d.orderNumber
              ? `Order ${d.orderNumber}`
              : d.transactionId
                ? d.transactionId.slice(0, 20) + (d.transactionId.length > 20 ? "…" : "")
                : `Donation ${formatCurrency(d.amountPence)}`,
            subtitle: [d.donor.firstName, d.donor.lastName].filter(Boolean).join(" "),
            url: "/admin/donations",
          }))
        ),

      prisma.demoOrder
        .findMany({
          where: {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { transactionId: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            orderNumber: true,
            totalPence: true,
            donorFirstName: true,
            donorLastName: true,
            donorEmail: true,
          },
          take: LIMIT,
        })
        .then(async (rows) => {
          const results: SearchResultItem[] = []
          for (const order of rows) {
            const qurbani = await prisma.qurbaniDonation.findFirst({
              where: { notes: { contains: `OrderNumber:${order.orderNumber}` } },
              select: { id: true },
              orderBy: { createdAt: "asc" },
            })
            results.push({
              type: "checkout",
              id: order.id,
              label: `Checkout ${order.orderNumber}`,
              subtitle: [
                [order.donorFirstName, order.donorLastName].filter(Boolean).join(" "),
                formatCurrency(order.totalPence),
              ]
                .filter(Boolean)
                .join(" · "),
              url: qurbani
                ? `/admin/donations?open=${qurbani.id}`
                : "/admin/donations",
            })
          }
          return results
        }),

      prisma.qurbaniDonation
        .findMany({
          where: {
            OR: [
              { donationNumber: { contains: q, mode: "insensitive" } },
              { notes: { contains: q, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            amountPence: true,
            donationNumber: true,
            notes: true,
            donor: { select: { firstName: true, lastName: true } },
            qurbaniCountry: { select: { country: true } },
          },
          take: 40,
          orderBy: { createdAt: "desc" },
        })
        .then((rows) => {
          const groups = new Map<string, typeof rows>()
          for (const row of rows) {
            const key = getQurbaniCheckoutGroupKey(row)
            const group = groups.get(key)
            if (group) group.push(row)
            else groups.set(key, [row])
          }
          return Array.from(groups.values())
            .slice(0, LIMIT)
            .map((group) => {
              const primary = group[0]
              const checkout = orderNumberFromNotes(primary.notes)
              const ref = checkout ?? primary.donationNumber ?? primary.id
              const total = group.reduce((sum, row) => sum + row.amountPence, 0)
              const lineLabel =
                group.length > 1
                  ? `${group.length}× ${primary.qurbaniCountry.country}`
                  : primary.qurbaniCountry.country
              return {
                type: "qurbani",
                id: primary.id,
                label: `Qurbani ${ref}`,
                subtitle: [
                  [primary.donor.firstName, primary.donor.lastName].filter(Boolean).join(" "),
                  lineLabel,
                  formatCurrency(total),
                ]
                  .filter(Boolean)
                  .join(" · "),
                url: `/admin/donations?open=${primary.id}`,
              }
            })
        }),

      prisma.appeal
        .findMany({
          where: {
            OR: [
              { title: contains(q) },
              { slug: contains(q) },
              { summary: contains(q) },
            ],
          },
          select: { id: true, title: true, slug: true },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((a) => ({
            type: "appeal",
            id: a.id,
            label: a.title,
            subtitle: a.slug,
            url: "/admin/appeals",
          }))
        ),

      prisma.fundraiser
        .findMany({
          where: {
            OR: [
              { fundraiserName: contains(q) },
              { email: contains(q) },
              { title: contains(q) },
              { slug: q },
            ],
          },
          select: { id: true, fundraiserName: true, title: true, email: true },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((f) => ({
            type: "fundraiser",
            id: f.id,
            label: f.fundraiserName,
            subtitle: `${f.title} · ${f.email}`,
            url: "/admin/fundraisers",
          }))
        ),

      prisma.masjid
        .findMany({
          where: {
            ...(staffFilter ?? {}),
            OR: [
              { name: contains(q) },
              { city: contains(q) },
              { contactName: contains(q) },
              { email: contains(q) },
              { address: contains(q) },
              { postcode: contains(q) },
            ],
          },
          select: { id: true, name: true, city: true, contactName: true },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((m) => ({
            type: "masjid",
            id: m.id,
            label: m.name,
            subtitle: [m.city, m.contactName].filter(Boolean).join(" · "),
            url: "/admin/masjids",
          }))
        ),

      prisma.adminUser
        .findMany({
          where: {
            OR: [
              { email: contains(q) },
              { firstName: contains(q) },
              { lastName: contains(q) },
            ],
          },
          select: { id: true, email: true, firstName: true, lastName: true },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((u) => ({
            type: "staff",
            id: u.id,
            label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
            subtitle: u.email,
            url: "/admin/staff",
          }))
        ),

      prisma.collection
        .findMany({
          where: { ...(staffFilter ?? {}), notes: contains(q) },
          select: {
            id: true,
            amountPence: true,
            notes: true,
            otherLocationName: true,
            masjid: { select: { name: true } },
          },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((c) => {
            const location = c.masjid?.name ?? c.otherLocationName
            return {
            type: "collection",
            id: c.id,
            label: location
              ? `${formatCurrency(c.amountPence)} – ${location}`
              : formatCurrency(c.amountPence),
            subtitle: c.notes ?? undefined,
            url: "/admin/collections",
          }
          })
        ),

      prisma.offlineIncome
        .findMany({
          where: { ...(staffFilter ?? {}), notes: contains(q) },
          select: { id: true, amountPence: true, notes: true },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((o) => ({
            type: "offline_income",
            id: o.id,
            label: formatCurrency(o.amountPence),
            subtitle: o.notes ?? undefined,
            url: "/admin/offline-income",
          }))
        ),

      prisma.recurringDonation
        .findMany({
          where: {
            OR: [
              { subscriptionId: { contains: q, mode: "insensitive" } },
              { donor: { email: contains(q) } },
              { donor: { firstName: contains(q) } },
              { donor: { lastName: contains(q) } },
            ],
          },
          select: {
            id: true,
            amountPence: true,
            donor: { select: { firstName: true, lastName: true, email: true } },
          },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((r) => ({
            type: "recurring",
            id: r.id,
            label: [r.donor.firstName, r.donor.lastName].filter(Boolean).join(" "),
            subtitle: `${formatCurrency(r.amountPence)} · ${r.donor.email}`,
            url: "/admin/recurring",
          }))
        ),

      prisma.waterProject
        .findMany({
          where: {
            OR: [
              { projectType: contains(q) },
              { location: contains(q) },
              { description: contains(q) },
            ],
          },
          select: { id: true, projectType: true, location: true },
          take: LIMIT,
        })
        .then((rows) => {
          const labels: Record<string, string> = {
            WATER_PUMP: "Water Pumps",
            WATER_WELL: "Water Wells",
            WATER_TANK: "Water Tanks",
            WUDHU_AREA: "Wudhu Areas",
          }
          return rows.map((w) => ({
            type: "water_project",
            id: w.id,
            label: labels[w.projectType] ?? w.projectType,
            subtitle: w.location ?? undefined,
            url: "/admin/water-projects",
          }))
        }),

      prisma.sponsorshipProject
        .findMany({
          where: {
            OR: [
              { projectType: contains(q) },
              { location: contains(q) },
              { description: contains(q) },
            ],
          },
          select: { id: true, projectType: true, location: true },
          take: LIMIT,
        })
        .then((rows) => {
          const labels: Record<string, string> = {
            ORPHANS: "Orphans",
            HIFZ: "Hifz",
            FAMILIES: "Families",
          }
          return rows.map((s) => ({
            type: "sponsorship",
            id: s.id,
            label: labels[s.projectType] ?? s.projectType,
            subtitle: s.location ?? undefined,
            url: "/admin/sponsorships",
          }))
        }),

      prisma.task
        .findMany({
          where: {
            OR: [{ title: contains(q) }, { description: contains(q) }],
          },
          select: { id: true, title: true, description: true },
          take: LIMIT,
        })
        .then((rows) =>
          rows.map((t) => ({
            type: "task",
            id: t.id,
            label: t.title,
            subtitle: t.description ?? undefined,
            url: "/admin/to-do",
          }))
        ),
    ])

    const results: SearchResultItem[] = [
      ...donors,
      ...donations,
      ...checkoutOrders,
      ...qurbaniCheckouts,
      ...appeals,
      ...fundraisers,
      ...masjids,
      ...adminUsers,
      ...collections,
      ...offlineIncome,
      ...recurring,
      ...waterProjects,
      ...sponsorships,
      ...tasks,
    ]

    return NextResponse.json({ results })
  } catch (e) {
    console.error("Admin search error:", e)
    return NextResponse.json({ results: [] })
  }
}
