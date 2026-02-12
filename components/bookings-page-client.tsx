"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AdminTable } from "@/components/admin-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatDateTime, isValidPostcode, toTitleCaseLive, toUpperCaseLive } from "@/lib/utils"
import { Plus, CalendarClock, Trash2, Building2, MapPin, Pencil } from "lucide-react"
import { toast } from "sonner"

export type CollectionBookingItem = {
  id: string
  locationName: string
  addressLine1: string
  postcode: string | null
  city: string | null
  country: string | null
  bookedByName: string | null
  scheduledAt: string
  notes: string | null
  addedBy?: { email: string; firstName: string | null; lastName: string | null } | null
}

type BookingsPageClientProps = {
  initialBookings: CollectionBookingItem[]
  canCreate: boolean
}

export function BookingsPageClient({
  initialBookings,
  canCreate,
}: BookingsPageClientProps) {
  const router = useRouter()
  const [bookings, setBookings] = React.useState<CollectionBookingItem[]>(initialBookings)
  const [addOpen, setAddOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [locationName, setLocationName] = React.useState("")
  const [addressLine1, setAddressLine1] = React.useState("")
  const [postcode, setPostcode] = React.useState("")
  const [city, setCity] = React.useState("")
  const [country, setCountry] = React.useState("")
  const [bookedByName, setBookedByName] = React.useState("")
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [selectedBooking, setSelectedBooking] = React.useState<CollectionBookingItem | null>(null)
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false)
  const [editingBooking, setEditingBooking] = React.useState<CollectionBookingItem | null>(null)

  const bookingsByDate = React.useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (!a.scheduledAt) return 1
      if (!b.scheduledAt) return -1
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    })
  }, [bookings])

  const refetchBookings = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/collections/bookings")
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        const list = Array.isArray(data?.bookings) ? data.bookings : []
        setBookings(
          list.filter(
            (b: unknown): b is CollectionBookingItem =>
              b != null && typeof (b as { id?: unknown }).id === "string"
          )
        )
      }
    } catch {
      // keep existing state
    }
  }, [])

  const resetForm = () => {
    setLocationName("")
    setAddressLine1("")
    setPostcode("")
    setCity("")
    setCountry("")
    setBookedByName("")
    const now = new Date()
    setDate(now.toISOString().slice(0, 10))
    setTime(now.toTimeString().slice(0, 5))
    setNotes("")
    setErrors({})
  }

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleOpenAdd = () => {
    setEditingBooking(null)
    resetForm()
    setAddOpen(true)
  }

  const handleOpenEdit = (b: CollectionBookingItem) => {
    setSelectedBooking(b)
    setDetailsModalOpen(false)
    setEditingBooking(b)
    setLocationName(b.locationName ?? "")
    setAddressLine1(b.addressLine1 ?? "")
    setPostcode(b.postcode ?? "")
    setCity(b.city ?? "")
    setCountry(b.country ?? "")
    setBookedByName(b.bookedByName ?? "")
    setNotes(b.notes ?? "")
    if (b.scheduledAt) {
      const d = new Date(b.scheduledAt)
      setDate(d.toISOString().slice(0, 10))
      setTime(d.toTimeString().slice(0, 5))
    }
    setErrors({})
    setAddOpen(true)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!locationName.trim()) {
      newErrors.locationName = "Location name is required"
    }
    if (!addressLine1.trim()) {
      newErrors.addressLine1 = "First line of address is required"
    }
    if (!date.trim()) {
      newErrors.date = "Date is required"
    }
    if (!time.trim()) {
      newErrors.time = "Time is required"
    }
    const countryForValidation = country.trim() || "GB"
    if (postcode.trim()) {
      if (!isValidPostcode(postcode.trim(), countryForValidation)) {
        newErrors.postcode =
          countryForValidation === "GB" || countryForValidation === "UK"
            ? "Enter a valid UK postcode (e.g. SW1A 1AA)"
            : "Enter a valid postcode (e.g. up to 10 characters)"
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Please fix the errors below")
      return
    }
    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    if (Number.isNaN(new Date(scheduledAt).getTime())) {
      setErrors({ date: "Please enter a valid date and time" })
      toast.error("Please enter a valid date and time")
      return
    }
    setErrors({})
    setSaving(true)
    const isEdit = Boolean(editingBooking?.id)
    const payload = {
      locationName: locationName.trim(),
      addressLine1: addressLine1.trim(),
      postcode: postcode.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      bookedByName: bookedByName.trim() || null,
      scheduledAt,
      notes: notes.trim() || null,
    }
    try {
      const url = isEdit
        ? `/api/admin/collections/bookings/${editingBooking!.id}`
        : "/api/admin/collections/bookings"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? (isEdit ? "Failed to update booking" : "Failed to add booking"))
        return
      }
      toast.success(isEdit ? "Booking updated" : "Booking added")
      setAddOpen(false)
      setEditingBooking(null)
      await refetchBookings()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDetailsModalOpen(false)
    setSelectedBooking(null)
    try {
      const res = await fetch(`/api/admin/collections/bookings/${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to delete booking")
        return
      }
      toast.success("Booking removed")
      await refetchBookings()
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Upcoming collection bookings</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Bookings for future collections (location, address, date & time)
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add booking
          </Button>
        )}
      </div>

      {bookings.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No upcoming bookings</p>
            {canCreate && (
              <Button variant="outline" className="mt-2" onClick={handleOpenAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add first booking
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 w-full">
          <AdminTable<CollectionBookingItem>
            data={bookingsByDate}
            onRowClick={(b) => {
              setSelectedBooking(b)
              setDetailsModalOpen(true)
            }}
            columns={[
              {
                id: "locationName",
                header: "Location",
                cell: (b) => <div className="font-medium">{b.locationName ?? "—"}</div>,
              },
              {
                id: "address",
                header: "Address",
                cell: (b) => (
                  <div className="text-muted-foreground text-sm">
                    {b.addressLine1 ?? "—"}
                    {(b.city || b.postcode || b.country) &&
                      `, ${[b.city, b.postcode, b.country].filter(Boolean).join(", ")}`}
                  </div>
                ),
              },
              {
                id: "scheduledAt",
                header: "Date & time",
                cell: (b) => (
                  <div className="text-sm">
                    {b.scheduledAt ? formatDateTime(b.scheduledAt) : "—"}
                  </div>
                ),
                enableSorting: true,
              },
              {
                id: "bookedByName",
                header: "Booked by",
                cell: (b) => (
                  <div className="text-muted-foreground text-sm">{b.bookedByName ?? "—"}</div>
                ),
              },
              {
                id: "notes",
                header: "Notes",
                cell: (b) => (
                  <div className="max-w-[200px] whitespace-normal text-muted-foreground text-sm">
                    {b.notes ?? "—"}
                  </div>
                ),
                enableSorting: false,
              },
              ...(canCreate
                ? [
                    {
                      id: "actions",
                      header: "Actions",
                      cell: (b: CollectionBookingItem) => (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(b.id)
                          }}
                          disabled={deletingId === b.id}
                          aria-label="Delete booking"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ),
                      enableSorting: false,
                    } as const,
                  ]
                : []),
            ]}
          />
        </div>
      )}

      <Dialog
        open={detailsModalOpen}
        onOpenChange={(open) => {
          setDetailsModalOpen(open)
          if (!open) setSelectedBooking(null)
        }}
      >
        <DialogContent className="p-6 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
            <DialogDescription>
              Collection booking information.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 py-2">
              <div className="flex gap-3">
                <Building2 className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedBooking.locationName ?? "—"}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-sm">
                    {selectedBooking.addressLine1 ?? "—"}
                    {(selectedBooking.city || selectedBooking.postcode || selectedBooking.country) &&
                      `, ${[selectedBooking.city, selectedBooking.postcode, selectedBooking.country].filter(Boolean).join(", ")}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date & time</p>
                  <p className="text-sm">
                    {selectedBooking.scheduledAt ? formatDateTime(selectedBooking.scheduledAt) : "—"}
                  </p>
                </div>
              </div>
              {selectedBooking.bookedByName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Booked by</p>
                  <p className="text-sm">{selectedBooking.bookedByName}</p>
                </div>
              )}
              {(selectedBooking.notes ?? "").trim() && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            {canCreate && selectedBooking && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleOpenEdit(selectedBooking)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedBooking.id)}
                  disabled={deletingId === selectedBooking.id}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) setEditingBooking(null)
        }}
      >
        <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBooking ? "Edit booking" : "Add upcoming collection"}</DialogTitle>
            <DialogDescription>
              {editingBooking
                ? "Update the booking details below."
                : "Enter the booking details: location name, address, date, time and who booked."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locationName">Location name</Label>
              <Input
                id="locationName"
                placeholder="e.g. Central Masjid, Local Shop"
                value={locationName}
                onChange={(e) => {
                  setLocationName(toTitleCaseLive(e.target.value))
                  clearError("locationName")
                }}
                className={cn(errors.locationName && "border-destructive")}
              />
              {errors.locationName && (
                <p className="text-xs text-destructive">{errors.locationName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">First line of address</Label>
              <Input
                id="addressLine1"
                placeholder="Street name and number"
                value={addressLine1}
                onChange={(e) => {
                  setAddressLine1(toTitleCaseLive(e.target.value))
                  clearError("addressLine1")
                }}
                className={cn(errors.addressLine1 && "border-destructive")}
              />
              {errors.addressLine1 && (
                <p className="text-xs text-destructive">{errors.addressLine1}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="e.g. SW1A 1AA"
                  value={postcode}
                  onChange={(e) => {
                    setPostcode(toUpperCaseLive(e.target.value))
                    clearError("postcode")
                  }}
                  className={cn(errors.postcode && "border-destructive")}
                />
                {errors.postcode && (
                  <p className="text-xs text-destructive">{errors.postcode}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(toTitleCaseLive(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(toTitleCaseLive(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookedByName">Booked by</Label>
              <Input
                id="bookedByName"
                placeholder="Who booked the collection (e.g. volunteer name)"
                value={bookedByName}
                onChange={(e) => setBookedByName(toTitleCaseLive(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value)
                    clearError("date")
                  }}
                  className={cn(errors.date && "border-destructive")}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value)
                    clearError("time")
                  }}
                  className={cn(errors.time && "border-destructive")}
                />
                {errors.time && (
                  <p className="text-xs text-destructive">{errors.time}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any extra details"
                value={notes}
                onChange={(e) => setNotes(toTitleCaseLive(e.target.value))}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? (editingBooking ? "Saving…" : "Adding…")
                  : (editingBooking ? "Save changes" : "Add booking")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
