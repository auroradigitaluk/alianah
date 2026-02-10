import { prisma } from "@/lib/prisma"
import { ZakatCalculator } from "@/components/zakat-calculator"

export const dynamic = "force-dynamic"

async function getAppealsForZakat() {
  try {
    let appeals = await prisma.appeal.findMany({
      where: { archivedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        allowMonthly: true,
        monthlyPricePence: true,
        oneOffPresetAmountsPence: true,
        monthlyPresetAmountsPence: true,
      },
    })
    if (appeals.length === 0) {
      const fallback = await prisma.appeal.findFirst({
        where: { archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          allowMonthly: true,
          monthlyPricePence: true,
          oneOffPresetAmountsPence: true,
          monthlyPresetAmountsPence: true,
        },
      })
      if (fallback) appeals = [fallback]
    }
    return appeals
  } catch {
    return []
  }
}

export default async function ZakatPage() {
  const appeals = await getAppealsForZakat()
  return <ZakatCalculator appeals={appeals} />
}
