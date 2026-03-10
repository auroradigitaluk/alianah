"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DonationsTable } from "@/components/donations-table"
import { AbandonedCheckoutsTable, type AbandonedCheckoutOrder } from "@/components/abandoned-checkouts-table"
import { ExportCsvButton } from "@/components/export-csv-modal"

export type DonationRow = {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  paymentMethod: string
  collectedVia?: string | null
  transactionId?: string | null
  orderNumber?: string | null
  giftAid: boolean
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  createdAt: Date
  completedAt?: Date | null
  donor: {
    title?: string | null
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    address?: string | null
    city?: string | null
    postcode?: string | null
    country?: string | null
  }
  appeal?: { title: string } | null
  product?: { name: string } | null
  fundraiser?: {
    fundraiserName: string
    title: string
    slug: string
    waterProjectId?: string | null
    waterProject?: { projectType: string } | null
    waterProjectCountry?: { country: string } | null
  } | null
}

export function DonationsPageContent({
  donations,
  abandonedCheckouts,
  openId,
}: {
  donations: DonationRow[]
  abandonedCheckouts: AbandonedCheckoutOrder[]
  openId?: string | null
}) {
  return (
    <Tabs defaultValue="donations" className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="donations">
            Donations
          </TabsTrigger>
          <TabsTrigger value="abandoned">
            Abandoned Checkouts
          </TabsTrigger>
        </TabsList>
        <ExportCsvButton exportType="donations" />
      </div>
      <TabsContent value="donations" className="mt-0">
        <DonationsTable donations={donations} initialSelectedId={openId} />
      </TabsContent>
      <TabsContent value="abandoned" className="mt-0">
        <AbandonedCheckoutsTable orders={abandonedCheckouts} />
      </TabsContent>
    </Tabs>
  )
}
