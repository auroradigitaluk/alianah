import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { getMasjidStats } from "@/lib/masjid"
import { formatCurrencyWhole } from "@/lib/utils"

export const dynamic = "force-dynamic"

const parseArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function getCountries() {
  try {
    const projects = await prisma.masjidProject.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
    })
    return Promise.all(
      projects.map(async (p) => ({
        slug: p.slug,
        country: p.country,
        title: p.title,
        summary: p.summary,
        priceFromPence: p.priceFromPence,
        priceToPence: p.priceToPence,
        image: parseArray(p.imageUrls)[0] ?? null,
        stats: await getMasjidStats(p.appealId),
      }))
    )
  } catch {
    return []
  }
}

export default async function MasjidsPage() {
  const countries = await getCountries()

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-10 md:px-6">
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">Build a Masjid</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            Fund a masjid in one of these countries, contribute any amount, or start your own fundraiser.
          </p>
        </div>

        {countries.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No masjid campaigns available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((c) => (
              <Link
                key={c.slug}
                href={`/masjids/${c.slug}`}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-video bg-muted">
                  {c.image && (
                    <Image
                      src={c.image}
                      alt={c.country}
                      fill
                      className="object-cover transition group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 360px"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold">{c.country}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-primary">
                      From {formatCurrencyWhole(c.priceFromPence)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrencyWhole(c.stats.raisedPence)} raised
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
