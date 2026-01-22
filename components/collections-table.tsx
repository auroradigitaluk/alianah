"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconCalendarEvent } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime } from "@/lib/utils"
import { DetailModal } from "@/components/detail-modal"

interface Collection {
  id: string
  amountPence: number
  donationType: string
  type: string
  collectedAt: Date
  masjid?: { name: string } | null
  appeal?: { title: string } | null
  notes?: string | null
}

export function CollectionsTable({ collections }: { collections: Collection[] }) {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  return (
    <>
      <AdminTable
        data={collections}
        onRowClick={(item) => setSelectedCollection(item)}
        columns={[
        {
          id: "masjid",
          header: "Masjid Name",
          cell: (item) => (
            <div className="font-medium">
              {item.masjid?.name || "No masjid"}
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
          id: "type",
          header: "Type",
          cell: (item) => (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <IconCalendarEvent className="mr-1 size-3" />
              {formatEnum(item.type)}
            </Badge>
          ),
        },
        {
          id: "appeal",
          header: "Appeal",
          cell: (item) => (
            <div className="text-sm">
              {item.appeal?.title || "General"}
            </div>
          ),
        },
        {
          id: "date",
          header: "Date",
          cell: (item) => (
            <div className="text-sm">
              {formatDate(item.collectedAt)}
            </div>
          ),
        },
      ]}
      />
      <DetailModal
        open={!!selectedCollection}
        onOpenChange={(open) => !open && setSelectedCollection(null)}
        title="Collection Details"
      >
        {selectedCollection && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Masjid</h3>
              <p className="text-base font-semibold">{selectedCollection.masjid?.name || "No masjid"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</h3>
              <p className="text-2xl font-semibold">{formatCurrency(selectedCollection.amountPence)}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</h3>
              <Badge variant="outline" className="text-muted-foreground px-1.5">
                <IconCalendarEvent className="mr-1 size-3" />
                {formatEnum(selectedCollection.type)}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donation Type</h3>
              <p className="text-base">{formatEnum(selectedCollection.donationType)}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Appeal</h3>
              <p className="text-base">{selectedCollection.appeal?.title || "General"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Collected</h3>
              <p className="text-base">{formatDateTime(selectedCollection.collectedAt)}</p>
            </div>
            {selectedCollection.notes && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</h3>
                <p className="text-base text-muted-foreground">{selectedCollection.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </>
  )
}
