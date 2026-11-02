import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { getMasjidStats } from "@/lib/masjid"
import { formatCurrencyWhole } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"
import { MasjidDonateBox } from "@/components/masjid-donate-box"

export const dynamic = "force-dynamic"

const parseArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function getProject(slug: string) {
  try {
    return await prisma.masjidProject.findFirst({
      where: { slug, isActive: true },
      include: { appeal: { select: { id: true, title: true, allowFundraising: true } } },
    })
  } catch {
    return null
  }
}

export default async function MasjidCountryPage({
  params,
}: {
  params: Promise<{ country: string }>
}) {
  const { country } = await params
  const project = await getProject(country)
  if (!project) notFound()

  const stats = await getMasjidStats(project.appealId)
  const images = parseArray(project.imageUrls)
  const canFundraise = project.allowFundraising && project.appeal.allowFundraising
  const priceLabel = project.priceToPence
    ? `${formatCurrencyWhole(project.priceFromPence)}–${formatCurrencyWhole(project.priceToPence)}`
    : formatCurrencyWhole(project.priceFromPence)

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-8 md:px-6">
        {images.length > 0 && (
          <div className="mb-6 space-y-4">
            {images.map((url, i) => (
              <div key={i} className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={url}
                  alt={`${project.country} - ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 text-center sm:mb-6">
          <h1 className="mb-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">{project.title}</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">{project.summary}</p>
          <div className="mt-3 flex items-center justify-center gap-4 text-sm">
            <span className="font-semibold text-primary">{priceLabel}</span>
            <span className="text-muted-foreground">{formatCurrencyWhole(stats.raisedPence)} raised</span>
          </div>
          {project.priceNote && <p className="mt-1 text-xs text-muted-foreground">{project.priceNote}</p>}
        </div>

        {canFundraise && (
          <div className="mb-4 sm:mb-6">
            <Button
              asChild
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-black"
            >
              <Link href={`/fundraiser/create?campaignId=${project.appeal.id}`}>
                <Users className="mr-2 h-4 w-4" />
                Start a Fundraiser for {project.country}
              </Link>
            </Button>
          </div>
        )}

        <Card className="!bg-transparent shadow-none hover:shadow-none">
          <CardContent className="space-y-5 pt-6">
            <MasjidDonateBox
              appealId={project.appeal.id}
              appealTitle={project.appeal.title}
              country={project.country}
              priceFromPence={project.priceFromPence}
              allowPartialDonations={project.allowPartialDonations}
            />
          </CardContent>
        </Card>

        {project.content && (
          <div className="mt-8 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground sm:text-base">
            {project.content}
          </div>
        )}

        {project.framerUrl && (
          <div className="mt-6 text-center">
            <Link
              href={project.framerUrl}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Read more →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
