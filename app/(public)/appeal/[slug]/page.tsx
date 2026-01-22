import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DonationForm } from "@/components/donation-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users } from "lucide-react"
import Image from "next/image"

export const dynamic = 'force-dynamic'

async function getAppeal(slug: string) {
  try {
    const appeal = await prisma.appeal.findUnique({
      where: { 
        slug
      },
      select: {
        id: true,
        title: true,
        summary: true,
        slug: true,
        isActive: true,
        allowMonthly: true,
        allowYearly: true,
        monthlyPricePence: true,
        yearlyPricePence: true,
        donationTypesEnabled: true,
        allowFundraising: true,
        framerUrl: true,
        appealImageUrls: true,
        products: {
          include: {
            product: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    })
    
    // Check if appeal exists and is active
    if (!appeal) {
      console.log(`Appeal not found: ${slug}`)
      return null
    }
    
    if (!appeal.isActive) {
      console.log(`Appeal is inactive: ${slug}`)
      return null
    }
    
    return appeal
  } catch (error) {
    console.error("Error fetching appeal:", error)
    return null
  }
}

export default async function AppealPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ frequency?: string; preset?: string; type?: string }>
}) {
  const { slug } = await params
  const urlParams = await searchParams
  const appeal = await getAppeal(slug)

  if (!appeal) {
    notFound()
  }

  const donationTypesEnabled = appeal.donationTypesEnabled
    ? JSON.parse(appeal.donationTypesEnabled)
    : ["GENERAL"]

  // Map URL params to internal values
  const mapFrequency = (freq?: string): "ONE_OFF" | "MONTHLY" | "YEARLY" | undefined => {
    if (!freq) return undefined
    const lower = freq.toLowerCase()
    if (lower === "monthly") return "MONTHLY"
    if (lower === "yearly") return "YEARLY"
    if (lower === "oneoff" || lower === "one-off") return "ONE_OFF"
    return undefined
  }

  const mapDonationType = (type?: string): "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH" | undefined => {
    if (!type) return undefined
    const upper = type.toUpperCase()
    if (["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"].includes(upper)) {
      return upper as "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
    }
    return undefined
  }

  // Use Framer URL from database, or fallback to environment/default
  const framerAppealUrl = appeal.framerUrl || `${process.env.NEXT_PUBLIC_FRAMER_URL || "https://alianah.org"}/appeal/${slug}`

  // Parse appeal images
  const appealImages: string[] = appeal.appealImageUrls
    ? (() => {
        try {
          return JSON.parse(appeal.appealImageUrls)
        } catch {
          return []
        }
      })()
    : []

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:px-6 md:py-8 max-w-2xl">
      {/* Appeal Images */}
      {appealImages.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="space-y-4">
            {appealImages.map((imageUrl, index) => (
              <div key={index} className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                <Image
                  src={imageUrl}
                  alt={`${appeal.title} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minimal Header */}
      <div className="mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight md:text-3xl mb-2">
          {appeal.title}
        </h1>
        {appeal.summary && (
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            {appeal.summary}
          </p>
        )}
      </div>

      {/* Fundraiser Setup Option */}
      {appeal.allowFundraising && (
        <div className="mb-4 sm:mb-6">
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href={`/fundraise/${appeal.slug}`}>
              <Users className="mr-2 h-4 w-4" />
              Set up a fundraiser for this appeal
            </Link>
          </Button>
        </div>
      )}

      {/* Donation Module - Primary Focus */}
      <div className="mb-4 sm:mb-6">
        <DonationForm
          appeal={{
            id: appeal.id,
            title: appeal.title,
            allowMonthly: appeal.allowMonthly,
            allowYearly: appeal.allowYearly,
            monthlyPricePence: appeal.monthlyPricePence,
            yearlyPricePence: appeal.yearlyPricePence,
          }}
          products={appeal.products}
          donationTypesEnabled={donationTypesEnabled}
          initialFrequency={mapFrequency(urlParams.frequency)}
          initialPreset={urlParams.preset ? Math.round(parseFloat(urlParams.preset) * 100) : undefined}
          initialDonationType={mapDonationType(urlParams.type)}
        />
      </div>

      {/* Optional Framer Link */}
      {appeal.framerUrl && (
        <div className="text-center">
          <Link
            href={framerAppealUrl}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Read full appeal details →
          </Link>
        </div>
      )}
    </div>
  )
}
