"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatDateTime, isValidPostcode, toTitleCaseLive, toUpperCaseLive } from "@/lib/utils"
import { Plus, MapPin, CalendarClock, Building2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { CollectionModal } from "@/components/collection-modal"
import { CollectionsTable } from "@/components/collections-table"
import { StaffFilterSelect } from "@/components/staff-filter-select"

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

type CollectionRow = {
  id: string
  amountPence: number
  donationType: string
  type: string
  collectedAt: Date | string
  masjidId?: string | null
  appealId?: string | null
  masjid?: { name: string } | null
  appeal?: { title: string } | null
  notes?: string | null
  addedByName?: string | null
  sadaqahPence?: number
  zakatPence?: number
  lillahPence?: number
  cardPence?: number
}

type CollectionsPageClientProps = {
  collections: CollectionRow[]
  masjids: { id: string; name: string }[]
  appeals: { id: string; title: string }[]
  staffUsers: { id: string; email: string; role: string; firstName: string | null; lastName: string | null }[]
  canCreate: boolean
  showLoggedBy: boolean
  canEdit: boolean
  initialBookings: CollectionBookingItem[]
}

export function CollectionsPageClient({
  collections,
  masjids,
  appeals,
  staffUsers,
  canCreate,
  showLoggedBy,
  canEdit,
  initialBookings,
}: CollectionsPageClientProps) {
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

  const refetchBookings = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/collections/bookings")
      if (res.ok) {
        const data = await res.json()
        setBookings(data.bookings ?? [])
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
    resetForm()
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
    try {
      const res = await fetch("/api/admin/collections/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: locationName.trim(),
          addressLine1: addressLine1.trim(),
          postcode: postcode.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          bookedByName: bookedByName.trim() || null,
          scheduledAt,
          notes: notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add booking")
        return
      }
      toast.success("Booking added")
      setAddOpen(false)
      await refetchBookings()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
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
      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="collections" className="mt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Collections</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Masjid collections (Jummah, Ramadan, Eid, etc.)
              </p>
            </div>
            <div className="flex flex-nowrap items-end gap-2">
              {staffUsers.length > 0 && <StaffFilterSelect staffUsers={staffUsers} />}
              {canCreate && <CollectionModal masjids={masjids} appeals={appeals} />}
            </div>
          </div>
          <div className="mt-2">
            <CollectionsTable
              collections={collections}
              showLoggedBy={showLoggedBy}
              canEdit={canEdit}
              masjids={masjids}
              appeals={appeals}
            />
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Upcoming collections</h2>
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bookings.map((b) => (
                <Card key={b.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <CardTitle className="text-base">{b.locationName}</CardTitle>
                      </div>
                      {canCreate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(b.id)}
                          disabled={deletingId === b.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {b.addressLine1}
                        {(b.city || b.postcode || b.country) &&
                          `, ${[b.city, b.postcode, b.country].filter(Boolean).join(", ")}`}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{formatDateTime(b.scheduledAt)}</span>
                    </div>
                    {b.bookedByName && (
                      <div className="text-muted-foreground">
                        Booked by {b.bookedByName}
                      </div>
                    )}
                    {b.notes && (
                      <p className="text-muted-foreground line-clamp-2">{b.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add upcoming collection</DialogTitle>
            <DialogDescription>
              Enter the booking details: location name, address, date, time and who booked.
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
                {saving ? "Adding…" : "Add booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
