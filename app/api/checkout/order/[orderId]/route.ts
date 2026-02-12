import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Public GET: return order status for success page polling. Only status and orderNumber are returned. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const order = await prisma.demoOrder.findUnique({
      where: { id: orderId },
      select: { status: true, orderNumber: true },
    })
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ status: order.status, orderNumber: order.orderNumber })
  } catch (error) {
    console.error("Order status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
