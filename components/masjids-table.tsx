"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { DetailModal } from "@/components/detail-modal"
import { formatCurrency } from "@/lib/utils"

interface Masjid {
  id: string
  name: string
  city: string
  address: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
  collectionCount: number
  totalAmountRaised: number
}

export function MasjidsTable({ masjids }: { masjids: Masjid[] }) {
  const [selectedMasjid, setSelectedMasjid] = useState<Masjid | null>(null)

  return (
    <>
      <AdminTable
        data={masjids}
        onRowClick={(masjid) => setSelectedMasjid(masjid)}
        columns={[
        {
          id: "name",
          header: "Masjid Name",
          cell: (masjid) => (
            <div className="font-medium">{masjid.name}</div>
          ),
        },
        {
          id: "contactName",
          header: "Masjid Contact Name",
          cell: (masjid) => (
            <div className="text-sm">{masjid.contactName || "-"}</div>
          ),
        },
        {
          id: "phone",
          header: "Phone Number",
          cell: (masjid) => (
            <div className="text-sm">{masjid.phone || "-"}</div>
          ),
        },
        {
          id: "email",
          header: "Email",
          cell: (masjid) => (
            <div className="text-sm">{masjid.email || "-"}</div>
          ),
        },
        {
          id: "city",
          header: "City",
          cell: (masjid) => <div className="text-sm">{masjid.city}</div>,
        },
        {
          id: "address",
          header: "Address",
          cell: (masjid) => <div className="text-sm">{masjid.address}</div>,
        },
        {
          id: "collectionCount",
          header: "No of Collections",
          cell: (masjid) => (
            <div className="text-sm">{masjid.collectionCount}</div>
          ),
        },
        {
          id: "totalAmountRaised",
          header: "Amount Raised at Masjid",
          cell: (masjid) => (
            <div className="font-medium">{formatCurrency(masjid.totalAmountRaised)}</div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedMasjid}
        onOpenChange={(open) => !open && setSelectedMasjid(null)}
        title={selectedMasjid?.name || "Masjid Details"}
      >
        {selectedMasjid && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Masjid Name</h3>
              <p className="text-base font-semibold">{selectedMasjid.name}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Masjid Contact Name</h3>
              <p className="text-base">{selectedMasjid.contactName || "-"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone Number</h3>
              <p className="text-base">{selectedMasjid.phone || "-"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</h3>
              <p className="text-base">{selectedMasjid.email || "-"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</h3>
              <p className="text-base">{selectedMasjid.city}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</h3>
              <p className="text-base">{selectedMasjid.address}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">No of Collections</h3>
              <p className="text-base">{selectedMasjid.collectionCount}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount Raised at Masjid</h3>
              <p className="text-2xl font-semibold">{formatCurrency(selectedMasjid.totalAmountRaised)}</p>
            </div>
            <div className="pt-2">
              <a
                href={`/admin/masjids/${selectedMasjid.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                Edit Masjid →
              </a>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
