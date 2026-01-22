"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconTag, IconCash, IconBuildingBank } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime } from "@/lib/utils"
import { DetailModal } from "@/components/detail-modal"

interface OfflineIncome {
  id: string
  amountPence: number
  donationType: string
  source: string
  receivedAt: Date
  appeal?: { title: string } | null
  notes?: string | null
}

export function OfflineIncomeTable({ income }: { income: OfflineIncome[] }) {
  const [selectedIncome, setSelectedIncome] = useState<OfflineIncome | null>(null)

  return (
    <>
      <AdminTable
        data={income}
        onRowClick={(item) => setSelectedIncome(item)}
        columns={[
        {
          id: "appeal",
          header: "Appeal Name",
          cell: (item) => (
            <div className="font-medium">
              {item.appeal?.title || "General"}
            </div>
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: (item) => (
            <div className="font-medium">
              {formatCurrency(item.amountPence)}
            </div>
          ),
        },
        {
          id: "source",
          header: "Source",
          cell: (item) => (
            <Badge 
              variant={item.source === "CASH" ? "default" : "outline"} 
              className={`px-1.5 ${
                item.source === "CASH" 
                  ? "" 
                  : "bg-blue-500 text-white border-blue-500"
              }`}
            >
              {item.source === "CASH" ? (
                <IconCash className="mr-1 size-3" />
              ) : (
                <IconBuildingBank className="mr-1 size-3" />
              )}
              {formatEnum(item.source)}
            </Badge>
          ),
        },
        {
          id: "date",
          header: "Date",
          cell: (item) => (
            <div className="text-sm">
              {formatDate(item.receivedAt)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedIncome}
        onOpenChange={(open) => !open && setSelectedIncome(null)}
        title="Offline Income Details"
      >
        {selectedIncome && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Appeal</h3>
              <p className="text-base font-semibold">{selectedIncome.appeal?.title || "General"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</h3>
              <p className="text-2xl font-semibold">{formatCurrency(selectedIncome.amountPence)}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</h3>
              <Badge variant="outline" className="text-muted-foreground px-1.5">
                <IconTag className="mr-1 size-3" />
                {formatEnum(selectedIncome.donationType)}
              </Badge>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</h3>
              <Badge 
                variant={selectedIncome.source === "CASH" ? "default" : "outline"} 
                className={`px-1.5 ${
                  selectedIncome.source === "CASH" 
                    ? "" 
                    : "bg-blue-500 text-white border-blue-500"
                }`}
              >
                {selectedIncome.source === "CASH" ? (
                  <IconCash className="mr-1 size-3" />
                ) : (
                  <IconBuildingBank className="mr-1 size-3" />
                )}
                {formatEnum(selectedIncome.source)}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Received</h3>
              <p className="text-base">{formatDateTime(selectedIncome.receivedAt)}</p>
            </div>
            {selectedIncome.notes && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</h3>
                <p className="text-base text-muted-foreground">{selectedIncome.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </>
  )
}
