"use client"

import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Registration {
  id: string
  name: string
  status: "Active" | "Pending"
  regDate: string
}

export function LatestRegistrationsTable({ data }: { data: Registration[] }) {
  return (
    <AdminTable
      data={data}
      columns={[
        {
          id: "name",
          header: "Name",
          cell: (row) => <div className="font-medium">{row.name}</div>,
        },
        {
          id: "status",
          header: "Status",
          cell: (row) => (
            <Badge
              variant={row.status === "Active" ? "default" : "secondary"}
              className={row.status === "Active" ? "bg-green-600" : ""}
            >
              {row.status}
            </Badge>
          ),
        },
        {
          id: "regDate",
          header: "Reg. Date",
          cell: (row) => <div className="text-sm">{row.regDate}</div>,
        },
        {
          id: "actions",
          header: "Actions",
          cell: () => (
            <Button variant="outline" size="sm">
              View
            </Button>
          ),
        },
      ]}
      enableSelection={false}
    />
  )
}
