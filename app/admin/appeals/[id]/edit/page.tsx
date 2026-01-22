import { AdminHeader } from "@/components/admin-header"
import { AppealForm } from "@/components/appeal-form"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

async function getAppeal(id: string) {
  return await prisma.appeal.findUnique({
    where: { id },
  })
}

export default async function EditAppealPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const appeal = await getAppeal(id)

  if (!appeal) {
    notFound()
  }

  // Parse JSON strings from database
  const donationTypesEnabled = appeal.donationTypesEnabled
    ? JSON.parse(appeal.donationTypesEnabled)
    : ["GENERAL"]

  const appealWithParsedData = {
    ...appeal,
    donationTypesEnabled,
  }

  return (
    <>
      <AdminHeader title="Edit Appeal" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Edit Appeal</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Update appeal details</p>
                </div>
                <div>
                  <AppealForm appeal={appealWithParsedData} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
