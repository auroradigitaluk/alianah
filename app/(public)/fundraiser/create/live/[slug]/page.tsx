import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getFundraiserBaseUrl } from "@/lib/utils"
import { FundraiserLivePageClient } from "@/components/fundraiser-live-page-client"

export const dynamic = "force-dynamic"

const parseImageArray = (value?: string | null): string[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function getFundraiserForLive(slug: string) {
  try {
    const fundraiser = await prisma.fundraiser.findUnique({
      where: { slug, isActive: true },
      select: {
        slug: true,
        title: true,
        fundraiserName: true,
        targetAmountPence: true,
        customImageUrls: true,
        appeal: {
          select: {
            fundraisingImageUrls: true,
            appealImageUrls: true,
          },
        },
        waterProject: {
          select: {
            fundraisingImageUrls: true,
            projectImageUrls: true,
          },
        },
      },
    })
    if (!fundraiser) return null

    const customImages = parseImageArray(fundraiser.customImageUrls)
    const isWater = Boolean(fundraiser.waterProject)
    const fundraisingImages = isWater
      ? parseImageArray(fundraiser.waterProject?.fundraisingImageUrls)
      : parseImageArray(fundraiser.appeal?.fundraisingImageUrls)
    const fallbackImages = isWater
      ? parseImageArray(fundraiser.waterProject?.projectImageUrls)
      : parseImageArray(fundraiser.appeal?.appealImageUrls)
    const imageUrl =
      customImages[0] ||
      fundraisingImages[0] ||
      fallbackImages[0] ||
      "https://sp-ao.shortpixel.ai/client/to_webp,q_glossy,ret_img,w_3000/https://alianah.org/wp-content/uploads/2025/05/4-1.webp"

    return {
      slug: fundraiser.slug,
      title: fundraiser.title,
      fundraiserName: fundraiser.fundraiserName,
      targetAmountPence: fundraiser.targetAmountPence,
      imageUrl,
    }
  } catch (error) {
    console.error("Error fetching fundraiser for live page:", error)
    return null
  }
}

export default async function FundraiserCreateLivePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getFundraiserForLive(slug)
  if (!data) notFound()

  // Use the public giving domain (e.g. give.alianah.org) for shareable links
  const baseUrl = getFundraiserBaseUrl()
  const campaignUrl = `${baseUrl}/fundraise/${data.slug}`

  return (
    <FundraiserLivePageClient
      campaignUrl={campaignUrl}
      title={data.title}
      fundraiserName={data.fundraiserName}
      targetAmountPence={data.targetAmountPence}
      imageUrl={data.imageUrl}
    />
  )
}
