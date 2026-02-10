"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DonationsTable } from "@/components/donations-table"

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
  fundraiser?: { fundraiserName: string; title: string; slug: string } | null
}

export function DonationsPageContent({
  donations,
  abandonedDonations,
}: {
  donations: DonationRow[]
  abandonedDonations: DonationRow[]
}) {
  return (
    <Tabs defaultValue="donations" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="donations">
          Donations ({donations.length})
        </TabsTrigger>
        <TabsTrigger value="abandoned">
          Abandoned checkouts ({abandonedDonations.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="donations" className="mt-0">
        <DonationsTable donations={donations} />
      </TabsContent>
      <TabsContent value="abandoned" className="mt-0">
        <DonationsTable donations={abandonedDonations} />
      </TabsContent>
    </Tabs>
  )
}
