"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconCheck, IconX, IconCircleCheckFilled, IconLoader } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDate, formatDateTime } from "@/lib/utils"
import { DetailModal } from "@/components/detail-modal"

interface Donation {
  id: string
  amountPence: number
  donationType: string
  status: string
  paymentMethod: string
  giftAid: boolean
  createdAt: Date
  completedAt?: Date | null
  donor: { firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
  product?: { name: string } | null
}

export function DonationsTable({ donations }: { donations: Donation[] }) {
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)

  return (
    <>
      <AdminTable
        data={donations}
        onRowClick={(donation) => setSelectedDonation(donation)}
        columns={[
        {
          id: "donor",
          header: "Donor Name",
          cell: (donation) => (
            <div className="font-medium">
              {donation.donor.firstName} {donation.donor.lastName}
            </div>
          ),
        },
        {
          id: "amount",
          header: "Amount",
          cell: (donation) => (
            <div className="font-medium">
              {formatCurrency(donation.amountPence)}
            </div>
          ),
        },
        {
          id: "campaign",
          header: "Campaign / Appeal / Product",
          cell: (donation) => (
            <div className="text-sm">
              {donation.product?.name || donation.appeal?.title || "General"}
            </div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (donation) => (
            <Badge
              variant={donation.status === "COMPLETED" ? "default" : "outline"}
              className="px-1.5"
            >
              {donation.status === "COMPLETED" ? (
                <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
              ) : (
                <IconLoader className="mr-1 size-3" />
              )}
              {formatEnum(donation.status)}
            </Badge>
          ),
        },
        {
          id: "date",
          header: "Date",
          cell: (donation) => (
            <div className="text-sm">
              {formatDate(donation.completedAt || donation.createdAt)}
            </div>
          ),
        },
        {
          id: "giftAid",
          header: "Gift Aid",
          cell: (donation) => (
            <div className="flex items-center">
              {donation.giftAid ? (
                <IconCheck className="h-4 w-4 text-primary" />
              ) : (
                <IconX className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedDonation}
        onOpenChange={(open) => !open && setSelectedDonation(null)}
        title={`Donation Details`}
      >
        {selectedDonation && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donor</h3>
              <p className="text-base font-semibold">
                {selectedDonation.donor.firstName} {selectedDonation.donor.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{selectedDonation.donor.email}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</h3>
              <p className="text-2xl font-semibold">{formatCurrency(selectedDonation.amountPence)}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign / Appeal / Product</h3>
              <p className="text-base">
                {selectedDonation.product?.name || selectedDonation.appeal?.title || "General"}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h3>
              <Badge
                variant={selectedDonation.status === "COMPLETED" ? "default" : "outline"}
                className="px-1.5"
              >
                {selectedDonation.status === "COMPLETED" ? (
                  <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
                ) : (
                  <IconLoader className="mr-1 size-3" />
                )}
                {formatEnum(selectedDonation.status)}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Method</h3>
              <p className="text-base">{formatEnum(selectedDonation.paymentMethod)}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gift Aid</h3>
              <div className="flex items-center gap-2">
                {selectedDonation.giftAid ? (
                  <>
                    <IconCheck className="h-4 w-4 text-primary" />
                    <span className="text-base">Yes</span>
                  </>
                ) : (
                  <>
                    <IconX className="h-4 w-4 text-muted-foreground" />
                    <span className="text-base">No</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donation Type</h3>
              <p className="text-base">{formatEnum(selectedDonation.donationType)}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</h3>
              <p className="text-base">
                {formatDateTime(selectedDonation.completedAt || selectedDonation.createdAt)}
              </p>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
