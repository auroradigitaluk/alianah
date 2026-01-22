"use client"

import { useState } from "react"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconPlayerPause, IconX, IconLoader } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate } from "@/lib/utils"
import { DetailModal } from "@/components/detail-modal"

interface RecurringDonation {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  nextPaymentDate?: Date | null
  lastPaymentDate?: Date | null
  donor: { firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
}

export function RecurringTable({ recurring }: { recurring: RecurringDonation[] }) {
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringDonation | null>(null)

  return (
    <>
      <AdminTable
        data={recurring}
        onRowClick={(item) => setSelectedRecurring(item)}
        columns={[
        {
          id: "donor",
          header: "Donor Name",
          cell: (item) => (
            <div className="font-medium">
              {item.donor.firstName} {item.donor.lastName}
            </div>
          ),
        },
        {
          id: "campaign",
          header: "Campaign / Appeal",
          cell: (item) => (
            <div className="text-sm">
              {item.appeal?.title || "General"}
            </div>
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: (item) => (
            <div className="font-medium">
              {formatCurrency(item.amountPence)} / {formatEnum(item.frequency).toLowerCase()}
            </div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (item) => {
            if (item.status === "ACTIVE") {
              return <StatusBadge isActive={true} />
            } else if (item.status === "PAUSED") {
              return (
                <Badge variant="outline" className="px-1.5 bg-orange-500 text-white border-orange-500">
                  <IconPlayerPause className="mr-1 size-3" />
                  {formatEnum(item.status)}
                </Badge>
              )
            } else if (item.status === "CANCELLED" || item.status === "FAILED") {
              return (
                <Badge variant="outline" className="px-1.5 bg-red-500 text-white border-red-500">
                  <IconX className="mr-1 size-3" />
                  {formatEnum(item.status)}
                </Badge>
              )
            } else {
              return (
                <Badge variant="outline" className="px-1.5 text-muted-foreground bg-muted">
                  <IconLoader className="mr-1 size-3" />
                  {formatEnum(item.status)}
                </Badge>
              )
            }
          },
        },
        {
          id: "nextPayment",
          header: "Next Payment",
          cell: (item) => (
            <div className="text-sm">
              {formatDate(item.nextPaymentDate)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedRecurring}
        onOpenChange={(open) => !open && setSelectedRecurring(null)}
        title="Recurring Donation Details"
      >
        {selectedRecurring && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donor</h3>
              <p className="text-base font-semibold">
                {selectedRecurring.donor.firstName} {selectedRecurring.donor.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{selectedRecurring.donor.email}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign / Appeal</h3>
              <p className="text-base">{selectedRecurring.appeal?.title || "General"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</h3>
              <p className="text-2xl font-semibold">
                {formatCurrency(selectedRecurring.amountPence)} / {formatEnum(selectedRecurring.frequency).toLowerCase()}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h3>
              {selectedRecurring.status === "ACTIVE" ? (
                <StatusBadge isActive={true} />
              ) : selectedRecurring.status === "PAUSED" ? (
                <Badge variant="outline" className="px-1.5 bg-orange-500 text-white border-orange-500">
                  <IconPlayerPause className="mr-1 size-3" />
                  {formatEnum(selectedRecurring.status)}
                </Badge>
              ) : selectedRecurring.status === "CANCELLED" || selectedRecurring.status === "FAILED" ? (
                <Badge variant="outline" className="px-1.5 bg-red-500 text-white border-red-500">
                  <IconX className="mr-1 size-3" />
                  {formatEnum(selectedRecurring.status)}
                </Badge>
              ) : (
                <Badge variant="outline" className="px-1.5 text-muted-foreground bg-muted">
                  <IconLoader className="mr-1 size-3" />
                  {formatEnum(selectedRecurring.status)}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donation Type</h3>
              <p className="text-base">{formatEnum(selectedRecurring.donationType)}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Payment</h3>
              <p className="text-base">
                {formatDate(selectedRecurring.nextPaymentDate)}
              </p>
            </div>
            {selectedRecurring.lastPaymentDate && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Payment</h3>
                <p className="text-base">
                  {formatDate(selectedRecurring.lastPaymentDate)}
                </p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </>
  )
}
