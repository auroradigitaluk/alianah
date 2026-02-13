"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatDateTime, formatEnum } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type QurbaniDonationRow = {
  id: string
  qurbaniCountryId: string
  size: string
  amountPence: number
  donationType: string
  paymentMethod: string
  createdAt: string
  qurbaniNames: string | null
  qurbaniCountry: { country: string }
  donor: { firstName: string; lastName: string; email: string }
}

const SIZE_LABELS: Record<string, string> = {
  ONE_SEVENTH: "1/7th",
  SMALL: "Small",
  LARGE: "Large",
}

export function QurbaniDonationsTab() {
  const [donations, setDonations] = useState<QurbaniDonationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [size, setSize] = useState("")

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (name.trim()) params.set("name", name.trim())
      if (country.trim()) params.set("country", country.trim())
      if (size) params.set("size", size)
      const res = await fetch(`/api/admin/qurbani/donations?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setDonations(data)
    } catch (e) {
      setDonations([])
    } finally {
      setLoading(false)
    }
  }, [name, country, size])

  useEffect(() => {
    fetchDonations()
  }, [fetchDonations])

  const clearFilters = useCallback(() => {
    setName("")
    setCountry("")
    setSize("")
  }, [])

  return (
    <div className="space-y-4">
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid flex-1 min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qurbani-donor">Donor name or email</Label>
              <Input
                id="qurbani-donor"
                transform="titleCase"
                placeholder="Search donor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qurbani-country">Country</Label>
              <Input
                id="qurbani-country"
                transform="titleCase"
                placeholder="Filter by country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={size || "all"} onValueChange={(v) => setSize(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sizes</SelectItem>
                  <SelectItem value="ONE_SEVENTH">1/7th</SelectItem>
                  <SelectItem value="SMALL">Small</SelectItem>
                  <SelectItem value="LARGE">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" onClick={clearFilters} className="shrink-0">
            Clear filters
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : donations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No qurbani donations found.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Name(s)</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDateTime(d.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {d.donor.firstName} {d.donor.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">{d.donor.email}</div>
                  </TableCell>
                  <TableCell>{d.qurbaniCountry.country}</TableCell>
                  <TableCell>{SIZE_LABELS[d.size] ?? d.size}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={d.qurbaniNames ?? undefined}>
                    {d.qurbaniNames ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(d.amountPence)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatEnum(d.donationType)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.paymentMethod}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
