import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendAbandonedCheckoutEmail } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorize(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const resumeUrl = `${baseUrl}/`

  const pendingOrders = await prisma.demoOrder.findMany({
    where: {
      status: "PENDING",
      createdAt: { lte: oneHourAgo },
    },
    include: { items: true },
  })

  let sent = 0

  for (const order of pendingOrders) {
    try {
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

      sent += 1
    } catch (error) {
      console.error(`Failed to send abandonment email for order ${order.orderNumber}:`, error)
    }
  }

  return NextResponse.json({ sent, processed: pendingOrders.length })
}
