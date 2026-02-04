import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { CollectionForm } from "./collection-form"

export const dynamic = "force-dynamic"

async function getData() {
  const [masjids, appeals] = await Promise.all([
    prisma.masjid.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.appeal.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ])
  return { masjids, appeals }
}

export default async function NewCollectionPage() {
  const { masjids, appeals } = await getData()

  return (
    <>
      <AdminHeader title="New Collection" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <CollectionForm masjids={masjids} appeals={appeals} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
