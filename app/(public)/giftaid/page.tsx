"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useSidecart } from "@/components/sidecart-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

export default function GiftAidPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const { items } = useSidecart()
  const [giftAid, setGiftAid] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const totalPence = React.useMemo(
    () => items.reduce((sum, i) => sum + (i.amountPence ?? 0), 0),
    [items]
  )

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/giftaid%20dark.png"
      : "/giftaid%20light.png"

  const handleContinue = () => {
    const params = new URLSearchParams()
    if (giftAid) params.set("giftAid", "true")
    router.push(`/checkout${params.toString() ? `?${params.toString()}` : ""}`)
  }

  if (items.length === 0) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-6">Your cart is empty.</p>
        <Button asChild>
          <a href="/#top">Browse appeals</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="container max-w-xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative w-40 h-16 sm:w-48 sm:h-20 mb-6">
          <Image
            src={logoSrc}
            alt="Gift Aid"
            fill
            className="object-contain object-center"
            priority
            unoptimized
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Do you pay tax in the UK?
        </h1>
        <p className="text-white text-sm sm:text-base max-w-md">
          If you&apos;re a UK taxpayer, you can add Gift Aid at no extra cost. We claim 25% from the government on your donation.
        </p>
      </div>

      <Card className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/15 dark:bg-white/5 shadow-xl shadow-black/5 backdrop-blur-xl backdrop-saturate-150">
        <CardHeader>
          <CardTitle className="text-lg">What is Gift Aid?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white leading-relaxed">
            Gift Aid lets charities reclaim tax on your donation. For every £1 you give, we can claim an extra 25p from HMRC. You don&apos;t pay anything more.
          </p>
          <div className="rounded-xl border border-white/10 dark:border-white/5 bg-white/10 dark:bg-white/5 backdrop-blur-md p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white">Your donation</span>
              <span className="font-medium text-white">{formatCurrency(totalPence)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white">With Gift Aid (25% added)</span>
              <span className="font-medium text-primary">
                {formatCurrency(Math.round(totalPence * 1.25))}
              </span>
            </div>
          </div>
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id="giftAid"
              checked={giftAid}
              onCheckedChange={(checked) => setGiftAid(checked === true)}
            />
            <Label
              htmlFor="giftAid"
              className="text-sm font-normal cursor-pointer leading-tight"
            >
              I am a UK taxpayer and would like to add Gift Aid to my donation of £{((totalPence || 0) / 100).toFixed(2)} and any donations I make in the future.
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
        {giftAid ? (
          <Button size="lg" className="w-full sm:w-auto" onClick={handleContinue}>
            Continue to checkout
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto rounded-md border-white/25 dark:border-white/20 bg-white/10 dark:bg-white/5 text-white hover:bg-white/20 hover:text-white backdrop-blur-md backdrop-saturate-150 shadow-lg shadow-black/5"
            onClick={() => router.push("/checkout")}
          >
            No thanks, continue without Gift Aid
          </Button>
        )}
      </div>
    </div>
  )
}
