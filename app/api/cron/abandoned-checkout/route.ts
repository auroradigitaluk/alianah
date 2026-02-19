import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAbandonedCheckoutEmail } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Vercel sends CRON_SECRET as Bearer token when invoking crons. Query ?token= also allowed for manual/external triggers. */
function authorize(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
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

  // 1) First email: 1 hour after abandon (PENDING order created ≥1h ago)
  const pendingOrders = await prisma.demoOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: oneHourAgo },
    },
    include: { items: true },
  })

  let sentFirst = 0
  for (const order of pendingOrders) {
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
        data: { status: "ABANDONED" },
      })
      sentFirst += 1
    } catch (error) {
      console.error(`Failed to send first abandonment email for order ${order.orderNumber}:`, error)
    }
  }

  // 2) Second email: 24 hours after abandon, only if not recovered yet (ABANDONED, no second email sent)
  const ordersForSecondEmail = await prisma.demoOrder.findMany({
    where: {
      status: "ABANDONED",
      abandonedEmail2SentAt: null,
      createdAt: { lte: twentyFourHoursAgo },
    },
    include: { items: true },
  })

  let sentSecond = 0
  for (const order of ordersForSecondEmail) {
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

  return NextResponse.json({
    sentFirst,
    sentSecond,
    processedFirst: pendingOrders.length,
    processedSecond: ordersForSecondEmail.length,
  })
}
