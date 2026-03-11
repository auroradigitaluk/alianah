import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAbandonedCheckoutEmail } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Vercel sends CRON_SECRET as Bearer token when invoking crons. Query ?token= also allowed for manual/external triggers. */
function authorize(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) return true
  const url = new URL(request.url)
  if (url.searchParams.get("token") === secret) return true
  return false
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")

  // 1) First email: 1 hour after abandon. Only send ONCE per (email, amount, day) so we don't spam if they clicked back.
  const pendingOrders = await prisma.demoOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: oneHourAgo },
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  })

  const dedupeKey = (order: (typeof pendingOrders)[0]) => {
    const email = (order.donorEmail ?? "").trim().toLowerCase()
    const d = order.createdAt
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    return `${email}|${order.totalPence}|${dateKey}`
  }
  const firstEmailGroupByKey = new Map<string, (typeof pendingOrders)[0]>()
  for (const order of pendingOrders) {
    const key = dedupeKey(order)
    if (!firstEmailGroupByKey.has(key)) firstEmailGroupByKey.set(key, order)
  }
  const ordersToSendFirstEmail = Array.from(firstEmailGroupByKey.values())
  const orderIdsToMarkOnly = new Set(pendingOrders.filter((o) => !ordersToSendFirstEmail.includes(o)).map((o) => o.id))

  let sentFirst = 0
  for (const order of ordersToSendFirstEmail) {
    try {
      const resumeUrl = `${baseUrl}/checkout?resume=${encodeURIComponent(order.orderNumber)}`
      await sendAbandonedCheckoutEmail({
        donorEmail: order.donorEmail,
        donorName: `${order.donorFirstName} ${order.donorLastName}`.trim() || "there",
        orderNumber: order.orderNumber,
        items: order.items.map((item) => ({
          title: item.productName ? `${item.appealTitle} • ${item.productName}` : item.appealTitle,
          amountPence: item.amountPence,
          frequency: item.frequency,
        })),
        totalPence: order.totalPence,
        resumeUrl,
      })
      await prisma.demoOrder.update({
        where: { id: order.id },
        data: { status: "ABANDONED", abandonedEmail1SentAt: new Date() },
      })
      sentFirst += 1
    } catch (error) {
      console.error(`Failed to send first abandonment email for order ${order.orderNumber}:`, error)
    }
  }
  // Mark duplicate PENDING orders (same email/amount/day) as ABANDONED + abandonedEmail1SentAt so we never send first email again for them
  for (const id of orderIdsToMarkOnly) {
    await prisma.demoOrder.update({
      where: { id },
      data: { status: "ABANDONED", abandonedEmail1SentAt: new Date() },
    })
  }

  // 2) Second email: 24 hours after abandon, only if not recovered yet. One per (email, amount, day).
  const ordersForSecondEmailRaw = await prisma.demoOrder.findMany({
    where: {
      status: "ABANDONED",
      abandonedEmail2SentAt: null,
      createdAt: { lte: twentyFourHoursAgo },
    },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  })
  const secondEmailKey = (order: (typeof ordersForSecondEmailRaw)[0]) => {
    const email = (order.donorEmail ?? "").trim().toLowerCase()
    const d = order.createdAt
    const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
    return `${email}|${order.totalPence}|${dateKey}`
  }
  const secondEmailGroupByKey = new Map<string, (typeof ordersForSecondEmailRaw)[0]>()
  for (const order of ordersForSecondEmailRaw) {
    const key = secondEmailKey(order)
    if (!secondEmailGroupByKey.has(key)) secondEmailGroupByKey.set(key, order)
  }
  const ordersToSendSecondEmail = Array.from(secondEmailGroupByKey.values())
  const orderIdsToMarkSecondOnly = new Set(
    ordersForSecondEmailRaw.filter((o) => !ordersToSendSecondEmail.includes(o)).map((o) => o.id)
  )

  let sentSecond = 0
  for (const order of ordersToSendSecondEmail) {
    try {
      const resumeUrl = `${baseUrl}/checkout?resume=${encodeURIComponent(order.orderNumber)}`
      await sendAbandonedCheckoutEmail({
        donorEmail: order.donorEmail,
        donorName: `${order.donorFirstName} ${order.donorLastName}`.trim() || "there",
        orderNumber: order.orderNumber,
        items: order.items.map((item) => ({
          title: item.productName ? `${item.appealTitle} • ${item.productName}` : item.appealTitle,
          amountPence: item.amountPence,
          frequency: item.frequency,
        })),
        totalPence: order.totalPence,
        resumeUrl,
      })
      await prisma.demoOrder.update({
        where: { id: order.id },
        data: { abandonedEmail2SentAt: new Date() },
      })
      sentSecond += 1
    } catch (error) {
      console.error(`Failed to send second abandonment email for order ${order.orderNumber}:`, error)
    }
  }
  for (const id of orderIdsToMarkSecondOnly) {
    await prisma.demoOrder.update({
      where: { id },
      data: { abandonedEmail2SentAt: new Date() },
    })
  }

  return NextResponse.json({
    sentFirst,
    sentSecond,
    processedFirst: pendingOrders.length,
    processedSecond: ordersForSecondEmailRaw.length,
  })
}
