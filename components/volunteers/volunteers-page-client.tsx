"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AdminTable } from "@/components/admin-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { IconLoader2, IconSearch, IconUserPlus } from "@tabler/icons-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

type Volunteer = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  city: string | null
  dateOfBirth: string | null
  notes: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export function VolunteersPageClient() {
  const [volunteers, setVolunteers] = React.useState<Volunteer[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchInput, setSearchInput] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")

  const fetchVolunteers = React.useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = q ? new URLSearchParams({ q }) : ""
      const res = await fetch(`/api/admin/volunteers${params ? `?${params}` : ""}`)
      if (!res.ok) throw new Error("Failed to load volunteers")
      const data = (await res.json()) as Volunteer[]
      setVolunteers(data)
    } catch {
      toast.error("Failed to load volunteers")
      setVolunteers([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchVolunteers(searchQuery)
  }, [fetchVolunteers, searchQuery])

  React.useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }

  if (loading && volunteers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Volunteers</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Search by name, email, city, or phone. New sign-ups appear here and can also be added manually.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, city, phone..."
            value={searchInput}
            onChange={handleSearchChange}
            className="pl-9"
            aria-label="Search volunteers"
          />
        </div>
        <Button asChild size="sm" className="shrink-0" variant="outline">
          <Link href="/volunteer" target="_blank" rel="noopener noreferrer">
            <IconUserPlus className="mr-2 h-4 w-4" />
            Volunteer sign-up form
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <AdminTable
          data={volunteers}
          columns={[
            {
              id: "name",
              header: "Name",
              cell: (v) => (
                <div className="font-medium">
                  {v.firstName} {v.lastName}
                </div>
              ),
            },
            {
              id: "email",
              header: "Email",
              cell: (v) => <div className="text-muted-foreground text-sm">{v.email}</div>,
            },
            {
              id: "phone",
              header: "Phone",
              cell: (v) => <div className="text-sm">{v.phone ?? "—"}</div>,
            },
            {
              id: "city",
              header: "City",
              cell: (v) => <div className="text-sm">{v.city ?? "—"}</div>,
            },
            {
              id: "dateOfBirth",
              header: "DOB",
              cell: (v) => (
                <div className="text-sm text-muted-foreground">
                  {v.dateOfBirth ? formatDate(v.dateOfBirth) : "—"}
                </div>
              ),
            },
            {
              id: "status",
              header: "Status",
              cell: (v) => (
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    v.status === "ACTIVE" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {v.status}
                </span>
              ),
            },
            {
              id: "createdAt",
              header: "Signed up",
              cell: (v) => <div className="text-sm text-muted-foreground">{formatDate(v.createdAt)}</div>,
            },
          ]}
        />
      </div>

      {!loading && volunteers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {searchQuery ? "No volunteers match your search." : "No volunteers yet. Share the sign-up form to get started."}
        </p>
      )}
    </div>
  )
}
