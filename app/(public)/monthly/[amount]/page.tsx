import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { MonthlyDonatePage } from "@/components/monthly-donate-page"
import { parseMonthlyAmountParam } from "@/lib/monthly-donate"

async function getAppealsForMonthlyDonate() {
  try {
    const appeals = await prisma.appeal.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        title: true,
        donationTypesEnabled: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })

    return appeals.map((appeal) => ({
      id: appeal.id,
      title: appeal.title,
      donationTypesEnabled: appeal.donationTypesEnabled
        ? (JSON.parse(appeal.donationTypesEnabled) as (
            | "GENERAL"
            | "SADAQAH"
            | "ZAKAT"
            | "LILLAH"
          )[])
        : (["GENERAL"] as ("GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH")[]),
    }))
  } catch (error) {
    console.error("Error fetching appeals for monthly donate:", error)
    return []
  }
}

export const dynamic = "force-dynamic"

export default async function MonthlyDonateAmountPage({
  params,
}: {
  params: Promise<{ amount: string }>
}) {
  const { amount } = await params
  const pounds = parseMonthlyAmountParam(amount)
  if (pounds == null) {
    redirect("/monthly")
  }

  const appeals = await getAppealsForMonthlyDonate()
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center pt-4 sm:pt-8">
      {stripePublishableKey ? (
        <MonthlyDonatePage
          appeals={appeals}
          stripePublishableKey={stripePublishableKey}
          initialAmountPounds={pounds}
        />
      ) : (
        <div className="mx-auto w-full max-w-md px-4 text-center text-sm text-muted-foreground">
          Payments are not configured. Set{" "}
          <span className="font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span> to enable
          monthly donations.
        </div>
      )}
    </div>
  )
}
