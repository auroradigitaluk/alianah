"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AdminTable } from "@/components/admin-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconLoader2, IconSearch, IconUserPlus, IconPencil, IconTrash } from "@tabler/icons-react"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

function formatDateForInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

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
  const [selectedVolunteer, setSelectedVolunteer] = React.useState<Volunteer | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [editFirstName, setEditFirstName] = React.useState("")
  const [editLastName, setEditLastName] = React.useState("")
  const [editEmail, setEditEmail] = React.useState("")
  const [editPhone, setEditPhone] = React.useState("")
  const [editCity, setEditCity] = React.useState("")
  const [editDateOfBirth, setEditDateOfBirth] = React.useState("")
  const [editNotes, setEditNotes] = React.useState("")
  const [editStatus, setEditStatus] = React.useState<"ACTIVE" | "INACTIVE">("ACTIVE")
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

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

  const openDetails = React.useCallback((v: Volunteer) => {
    setSelectedVolunteer(v)
    setEditing(false)
    setEditFirstName(v.firstName)
    setEditLastName(v.lastName)
    setEditEmail(v.email)
    setEditPhone(v.phone ?? "")
    setEditCity(v.city ?? "")
    setEditDateOfBirth(formatDateForInput(v.dateOfBirth))
    setEditNotes(v.notes ?? "")
    setEditStatus(v.status as "ACTIVE" | "INACTIVE")
    setDetailsOpen(true)
  }, [])

  const closeDetails = React.useCallback(() => {
    setDetailsOpen(false)
    setSelectedVolunteer(null)
    setEditing(false)
    setDeletingId(null)
  }, [])

  const handleUpdate = React.useCallback(async () => {
    if (!selectedVolunteer) return
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      toast.error("First name, last name and email are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/volunteers/${selectedVolunteer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || null,
          city: editCity.trim() || null,
          dateOfBirth: editDateOfBirth
            ? new Date(editDateOfBirth + "T00:00:00").toISOString()
            : null,
          notes: editNotes.trim() || null,
          status: editStatus,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to update")
      toast.success("Volunteer updated")
      setEditing(false)
      setSelectedVolunteer(data)
      setVolunteers((prev) =>
        prev.map((v) => (v.id === data.id ? data : v))
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update volunteer")
    } finally {
      setSaving(false)
    }
  }, [
    selectedVolunteer,
    editFirstName,
    editLastName,
    editEmail,
    editPhone,
    editCity,
    editDateOfBirth,
    editNotes,
    editStatus,
  ])

  const handleDelete = React.useCallback(async () => {
    if (!selectedVolunteer) return
    if (!confirm("Delete this volunteer? This cannot be undone.")) return
    setDeletingId(selectedVolunteer.id)
    try {
      const res = await fetch(`/api/admin/volunteers/${selectedVolunteer.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to delete")
      }
      toast.success("Volunteer deleted")
      closeDetails()
      setVolunteers((prev) => prev.filter((v) => v.id !== selectedVolunteer.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete volunteer")
    } finally {
      setDeletingId(null)
    }
  }, [selectedVolunteer, closeDetails])

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

      <AdminTable
        data={volunteers}
        onRowClick={openDetails}
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

      {!loading && volunteers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {searchQuery ? "No volunteers match your search." : "No volunteers yet. Share the sign-up form to get started."}
        </p>
      )}

      <Dialog open={detailsOpen} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit volunteer" : "Volunteer details"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the volunteer details and save."
                : "View details or edit/delete this volunteer."}
            </DialogDescription>
          </DialogHeader>
          {selectedVolunteer && (
            <>
              {editing ? (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-first">First name</Label>
                      <Input
                        id="edit-first"
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-last">Last name</Label>
                      <Input
                        id="edit-last"
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-phone">Phone (optional)</Label>
                    <Input
                      id="edit-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-city">City (optional)</Label>
                    <Input
                      id="edit-city"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-dob">Date of birth (optional)</Label>
                    <Input
                      id="edit-dob"
                      type="date"
                      value={editDateOfBirth}
                      onChange={(e) => setEditDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-notes">Notes (optional)</Label>
                    <Textarea
                      id="edit-notes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "ACTIVE" | "INACTIVE")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 py-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">
                      {selectedVolunteer.firstName} {selectedVolunteer.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Email</span>
                    <span>{selectedVolunteer.email}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{selectedVolunteer.phone ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">City</span>
                    <span>{selectedVolunteer.city ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Date of birth</span>
                    <span>
                      {selectedVolunteer.dateOfBirth
                        ? formatDate(selectedVolunteer.dateOfBirth)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Status</span>
                    <span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          selectedVolunteer.status === "ACTIVE"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {selectedVolunteer.status}
                      </span>
                    </span>
                  </div>
                  {(selectedVolunteer.notes ?? "").trim() && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Notes</span>
                      <span className="text-right whitespace-pre-wrap max-w-[240px]">
                        {selectedVolunteer.notes}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Signed up</span>
                    <span>{formatDate(selectedVolunteer.createdAt)}</span>
                  </div>
                </div>
              )}
              <DialogFooter>
                {editing ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={saving}>
                      {saving && <IconLoader2 className="size-4 animate-spin mr-2" />}
                      Save changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(true)}
                      disabled={!!deletingId}
                    >
                      <IconPencil className="size-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={!!deletingId}
                    >
                      {deletingId === selectedVolunteer.id ? (
                        <IconLoader2 className="size-4 animate-spin mr-2" />
                      ) : (
                        <IconTrash className="size-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
