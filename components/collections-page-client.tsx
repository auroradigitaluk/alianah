"use client"

import { CollectionModal } from "@/components/collection-modal"
import { CollectionsTable } from "@/components/collections-table"
import { StaffFilterSelect } from "@/components/staff-filter-select"

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
}

export function CollectionsPageClient({
  collections,
  masjids,
  appeals,
  staffUsers,
  canCreate,
  showLoggedBy,
  canEdit,
}: CollectionsPageClientProps) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
    </div>
  )
}
