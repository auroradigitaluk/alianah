import { AdminHeader } from "@/components/admin-header"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getDeduplicatedDonationSum } from "@/lib/donation-dedup"
import { formatCurrencyWhole } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function getFundraisers() {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      where: { appeal: { masjidProject: { isNot: null } } },
      select: {
        id: true,
        title: true,
        slug: true,
        fundraiserName: true,
        isActive: true,
        targetAmountPence: true,
        appeal: { select: { masjidProject: { select: { country: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })
    return Promise.all(
      fundraisers.map(async (f) => ({
        ...f,
        raisedPence: await getDeduplicatedDonationSum({ fundraiserId: f.id, status: "COMPLETED" }),
      }))
    )
  } catch {
    return []
  }
}

export default async function MasjidFundraisersPage() {
  const fundraisers = await getFundraisers()

  return (
    <>
      <AdminHeader title="Masjid Fundraisers" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <h2 className="mb-4 text-base sm:text-lg font-semibold">Fundraisers</h2>
              {fundraisers.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                  No masjid fundraisers yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Campaign</th>
                        <th className="px-4 py-3">Country</th>
                        <th className="px-4 py-3">Organiser</th>
                        <th className="px-4 py-3">Raised</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {fundraisers.map((f) => (
                        <tr key={f.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{f.title}</td>
                          <td className="px-4 py-3">{f.appeal?.masjidProject?.country ?? "—"}</td>
                          <td className="px-4 py-3">{f.fundraiserName}</td>
                          <td className="px-4 py-3 font-semibold">{formatCurrencyWhole(f.raisedPence)}</td>
                          <td className="px-4 py-3">
                            {f.targetAmountPence ? formatCurrencyWhole(f.targetAmountPence) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={f.isActive ? "default" : "secondary"}>
                              {f.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/fundraise/${f.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
