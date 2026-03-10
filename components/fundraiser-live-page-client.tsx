"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatCurrencyWhole } from "@/lib/utils"
import { Check, Link2 } from "lucide-react"

interface FundraiserLivePageClientProps {
  campaignUrl: string
  title: string
  fundraiserName: string
  targetAmountPence: number | null
  imageUrl: string
}

export function FundraiserLivePageClient({
  campaignUrl,
  title,
  fundraiserName,
  targetAmountPence,
  imageUrl,
}: FundraiserLivePageClientProps) {
  const [copied, setCopied] = React.useState(false)

  const shareText = encodeURIComponent(
    `I'm fundraising for “${title}” with Alianah Humanity Welfare 💙\n\nPlease support this cause by donating via my page 🤲`
  )
  const whatsappUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(campaignUrl)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(campaignUrl)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: open in new window or show URL
    }
  }

  return (
    <div className="flex flex-col items-center text-center w-full max-w-md mx-auto px-4 py-12 min-h-[70vh]">
      <p className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mb-1">
        Alhamdulilah, all set!
      </p>
      <p className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
        Your campaign is live.
      </p>
      <p className="text-muted-foreground text-sm mb-8">
        Share it with friends and increase the impact of your campaign.
      </p>

      {/* Share icons */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors"
          aria-label="Share on WhatsApp"
        >
          <svg className="size-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.436 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </a>
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors"
          aria-label="Share on Facebook"
        >
          <svg className="size-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors"
          aria-label="Share on X"
        >
          <svg className="size-5 text-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 rounded-full shrink-0"
          onClick={copyLink}
          aria-label="Copy link"
        >
          {copied ? (
            <Check className="size-5 text-primary" />
          ) : (
            <Link2 className="size-5" />
          )}
        </Button>
      </div>

      {/* Preview card */}
      <div className="w-full rounded-xl border border-border bg-card overflow-hidden shadow-lg">
        <div className="relative aspect-[4/3] w-full bg-muted">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 400px) 100vw, 400px"
          />
        </div>
        <div className="p-4 text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-semibold">
              {fundraiserName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-muted-foreground">{fundraiserName}</span>
          </div>
          <h3 className="font-semibold text-foreground mb-3 line-clamp-2">{title}</h3>
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground mb-4">
            <span>£0 raised</span>
            {targetAmountPence != null && targetAmountPence > 0 && (
              <span>of {formatCurrencyWhole(targetAmountPence)}</span>
            )}
          </div>
          <Button asChild className="w-full h-11 font-semibold" size="lg">
            <Link href={campaignUrl} target="_blank" rel="noopener noreferrer">
              Support
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-6">
        <Link href="/fundraiser/dashboard" className="underline hover:no-underline">
          Go to dashboard
        </Link>
        {" · "}
        <Link href="/fundraiser" className="underline hover:no-underline">
          Fundraiser hub
        </Link>
      </p>
    </div>
  )
}
