import { AdminHeader } from "@/components/admin-header"
import { MasjidForm } from "@/components/masjid-form"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getMasjid(id: string) {
  return await prisma.masjid.findUnique({
    where: { id },
  })
}

export default async function EditMasjidPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const masjid = await getMasjid(id)

  if (!masjid) {
    notFound()
  }

  return (
    <>
      <AdminHeader title="Edit Masjid" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Edit Masjid</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Update masjid contact details
                  </p>
                </div>
                <div>
                  <MasjidForm masjid={masjid} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
