"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { DetailModal } from "@/components/detail-modal"
import { formatCurrency } from "@/lib/utils"

interface Donor {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
  totalAmountDonated: number
}

export function DonorsTable({ donors }: { donors: Donor[] }) {
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null)

  return (
    <>
      <AdminTable
        data={donors}
        onRowClick={(donor) => setSelectedDonor(donor)}
        columns={[
        {
          id: "name",
          header: "Donor Name",
          cell: (donor) => (
            <div className="font-medium">
              {donor.firstName} {donor.lastName}
            </div>
          ),
        },
        {
          id: "email",
          header: "Email",
          cell: (donor) => (
            <div className="text-sm">{donor.email}</div>
          ),
        },
        {
          id: "phone",
          header: "Phone",
          cell: (donor) => (
            <div className="text-sm">{donor.phone || "-"}</div>
          ),
        },
        {
          id: "address",
          header: "Address",
          cell: (donor) => {
            const addressParts = [
              donor.address,
              donor.city,
              donor.postcode,
              donor.country,
            ].filter(Boolean)
            return (
              <div className="text-sm">
                {addressParts.length > 0 ? addressParts.join(", ") : "-"}
              </div>
            )
          },
        },
        {
          id: "amount",
          header: "Amount Donated So Far",
          cell: (donor) => (
            <div className="font-medium">
              {formatCurrency(donor.totalAmountDonated)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedDonor}
        onOpenChange={(open) => !open && setSelectedDonor(null)}
        title={`${selectedDonor?.firstName} ${selectedDonor?.lastName}` || "Donor Details"}
      >
        {selectedDonor && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</h3>
              <p className="text-base font-semibold">
                {selectedDonor.firstName} {selectedDonor.lastName}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</h3>
              <p className="text-base">{selectedDonor.email}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</h3>
              <p className="text-base">{selectedDonor.phone || "-"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</h3>
              <p className="text-base">
                {[
                  selectedDonor.address,
                  selectedDonor.city,
                  selectedDonor.postcode,
                  selectedDonor.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount Donated So Far</h3>
              <p className="text-2xl font-semibold">{formatCurrency(selectedDonor.totalAmountDonated)}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
