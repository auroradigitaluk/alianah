"use client"

import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"

interface Transaction {
  id: string
  paidBy: string
  packageName: string
  price: string
  status: "Active" | "Expired"
  paidDate: string
}

export function LatestTransactionsTable({ data }: { data: Transaction[] }) {
  return (
    <AdminTable
      data={data}
      columns={[
        {
          id: "paidBy",
          header: "Paid By",
          cell: (row) => <div className="font-medium">{row.paidBy}</div>,
        },
        {
          id: "packageName",
          header: "Package Name",
          cell: (row) => <div className="text-sm">{row.packageName}</div>,
        },
        {
          id: "price",
          header: "Price",
          cell: (row) => <div className="font-medium">{row.price}</div>,
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => (
            <Badge
              variant={row.status === "Active" ? "default" : "destructive"}
              className={row.status === "Active" ? "bg-green-600" : ""}
            >
              {row.status}
            </Badge>
          ),
        },
        {
          id: "paidDate",
          header: "Paid Date",
          cell: (row) => <div className="text-sm">{row.paidDate}</div>,
        },
      ]}
      enableSelection={false}
    />
  )
}
