"use client"

import { useMemo, useState, useEffect } from "react"
import { AdminTable } from "@/components/admin-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatDonorName } from "@/lib/utils"
import { DonorDetailsDialog, type DonorDetails } from "@/components/donor-details-dialog"

export function DonorsTable({
  donors,
  initialSelectedId,
}: {
  donors: DonorDetails[]
  initialSelectedId?: string | null
}) {
  const [selectedDonor, setSelectedDonor] = useState<DonorDetails | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (initialSelectedId) {
      const donor = donors.find((d) => d.id === initialSelectedId) ?? null
      setSelectedDonor(donor)
    }
  }, [initialSelectedId, donors])
  const [cityQuery, setCityQuery] = useState("")
  const [countryQuery, setCountryQuery] = useState("")

  const filteredDonors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const normalizedCity = cityQuery.trim().toLowerCase()
    const normalizedCountry = countryQuery.trim().toLowerCase()

    return donors.filter((donor) => {
      const donorName = formatDonorName(donor).toLowerCase()
      const email = donor.email.toLowerCase()
      const matchesQuery = normalizedQuery
        ? donorName.includes(normalizedQuery) || email.includes(normalizedQuery)
        : true
      const matchesCity = normalizedCity
        ? (donor.city || "").toLowerCase().includes(normalizedCity)
        : true
      const matchesCountry = normalizedCountry
        ? (donor.country || "").toLowerCase().includes(normalizedCountry)
        : true

      return matchesQuery && matchesCity && matchesCountry
    })
  }, [cityQuery, countryQuery, donors, query])

  const clearFilters = () => {
    setQuery("")
    setCityQuery("")
    setCountryQuery("")
  }

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="donors-query">Donor name or email</Label>
            <Input
              id="donors-query"
              transform="titleCase"
              placeholder="Search donor"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donors-city">City</Label>
            <Input
              id="donors-city"
              transform="titleCase"
              placeholder="Filter by city"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donors-country">Country</Label>
            <Input
              id="donors-country"
              transform="titleCase"
              placeholder="Filter by country"
              value={countryQuery}
              onChange={(event) => setCountryQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
      <AdminTable
        data={filteredDonors}
        onRowClick={(donor) => setSelectedDonor(donor)}
        columns={[
        {
          id: "name",
          header: "Donor Name",
          cell: (donor) => (
            <div className="font-medium">
              {formatDonorName(donor)}
            </div>
          ),
        },
        {
          id: "donationCount",
          header: "Number of Donations",
          cell: (donor) => (
            <div className="text-sm">{donor.donationCount}</div>
          ),
        },
        {
          id: "amount",
          header: "Amount Donated",
          cell: (donor) => (
            <div className="font-medium">
              {formatCurrency(donor.totalAmountDonated)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DonorDetailsDialog
        donor={selectedDonor}
        open={!!selectedDonor}
        onOpenChange={(open) => !open && setSelectedDonor(null)}
      />
    </>
  )
}
