import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { BookingsPageClient } from "@/components/bookings-page-client"
import { getAdminUser } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getUpcomingBookings() {
  try {
    return await prisma.collectionBooking.findMany({
      where: { scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      include: {
        addedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    })
  } catch {
    return []
  }
}

export default async function BookingsPage() {
  const user = await getAdminUser()
  const upcomingBookings = await getUpcomingBookings()
  const canCreate = Boolean(user && user.role !== "VIEWER")

  const initialBookings = upcomingBookings.map((b) => ({
    id: b.id,
    locationName: b.locationName,
    addressLine1: b.addressLine1,
    postcode: b.postcode,
    city: b.city,
    country: b.country,
    bookedByName: b.bookedByName,
    scheduledAt: b.scheduledAt.toISOString(),
    notes: b.notes,
    addedBy: b.addedBy,
  }))

  return (
    <>
      <AdminHeader title="Bookings" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <BookingsPageClient
                initialBookings={initialBookings}
                canCreate={canCreate}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
