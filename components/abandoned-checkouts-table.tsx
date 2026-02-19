"use client"

import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { IconCheck, IconExternalLink, IconX } from "@tabler/icons-react"
import Link from "next/link"

export type AbandonedCheckoutOrder = {
  id: string
  orderNumber: string
  status: string
  createdAt: Date
  donorFirstName: string
  donorLastName: string
  donorEmail: string
  totalPence: number
  abandonedEmail1SentAt?: Date | null
  items: Array<{ appealTitle: string; productName: string | null; amountPence: number }>
}

function formatDonorName(order: AbandonedCheckoutOrder) {
  const name = `${order.donorFirstName} ${order.donorLastName}`.trim()
  return name || order.donorEmail || "—"
}

export function AbandonedCheckoutsTable({ orders }: { orders: AbandonedCheckoutOrder[] }) {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || ""

  // Normalize dates (server sends serialized ISO strings)
  const normalizedOrders = orders.map((order) => ({
    ...order,
    createdAt: order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt as string),
  }))

  if (normalizedOrders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">No abandoned checkouts</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Checkouts that are left incomplete (e.g. at the payment step) will appear here. Completed
          donations show under the Donations tab.
        </p>
      </div>
    )
  }

  return (
    <AdminTable
      data={normalizedOrders}
      columns={[
        {
          id: "orderNumber",
          header: "Order No.",
          cell: (order) => (
            <span className="font-mono text-sm">{order.orderNumber}</span>
          ),
        },
        {
          id: "donor",
          header: "Donor",
          cell: (order) => (
            <div className="font-medium">{formatDonorName(order)}</div>
          ),
        },
        {
          id: "email",
          header: "Email",
          cell: (order) => (
            <span className="text-sm text-muted-foreground">{order.donorEmail}</span>
          ),
        },
        {
          id: "total",
          header: "Total",
          cell: (order) => (
            <div className="font-medium">{formatCurrency(order.totalPence)}</div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (order) => {
            const isSaved = order.status === "COMPLETED" && order.abandonedEmail1SentAt
            return (
              <Badge
                variant="outline"
                className={
                  isSaved
                    ? "px-1.5 border-green-600 bg-green-600/10 text-green-700 dark:text-green-400"
                    : "px-1.5 border-red-600 bg-red-600/10 text-red-700 dark:text-red-400"
                }
              >
                {isSaved ? (
                  <>
                    <IconCheck className="mr-1 size-3" />
                    Saved
                  </>
                ) : (
                  <>
                    <IconX className="mr-1 size-3" />
                    Abandoned
                  </>
                )}
              </Badge>
            )
          },
        },
        {
          id: "date",
          header: "Created",
          cell: (order) => (
            <div className="text-sm">{formatDate(order.createdAt)}</div>
          ),
        },
        {
          id: "resume",
          header: "",
          cell: (order) => {
            const isSaved = order.status === "COMPLETED" && order.abandonedEmail1SentAt
            if (isSaved) {
              return <span className="text-sm text-muted-foreground">Completed</span>
            }
            return (
              <Link
                href={`${baseUrl}/checkout?resume=${encodeURIComponent(order.orderNumber)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Resume link
                <IconExternalLink className="size-3.5" />
              </Link>
            )
          },
        },
      ]}
      enableSelection={false}
    />
  )
}
