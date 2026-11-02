import { notFound } from "next/navigation"
import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { MasjidProjectForm, type MasjidProjectFormValues } from "@/components/masjid-project-form"

export const dynamic = "force-dynamic"
export const revalidate = 0

const parseArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default async function EditMasjidProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await prisma.masjidProject.findUnique({ where: { id } })
  if (!project) notFound()

  const initial: MasjidProjectFormValues = {
    id: project.id,
    country: project.country,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    content: project.content,
    priceFromPence: project.priceFromPence,
    priceToPence: project.priceToPence,
    priceNote: project.priceNote,
    imageUrls: parseArray(project.imageUrls),
    fundraisingImageUrls: parseArray(project.fundraisingImageUrls),
    fundraisingDefaultMessage: project.fundraisingDefaultMessage,
    allowFundraising: project.allowFundraising,
    allowPartialDonations: project.allowPartialDonations,
    framerUrl: project.framerUrl,
    isActive: project.isActive,
  }

  return (
    <>
      <AdminHeader title={`Edit ${project.country}`} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Edit Country</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Update content, prices and images.</p>
                </div>
                <MasjidProjectForm initial={initial} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
