"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const POLL_INTERVAL_MS = 2000

export function SuccessPending({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/checkout/order/${orderId}`)
        if (!res.ok) return
        const data = (await res.json()) as { status: string }
        if (data.status === "COMPLETED") {
          router.refresh()
          return
        }
      } catch {
        // ignore
      }
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [orderId, router])

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 md:px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="!bg-transparent shadow-none hover:shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground animate-spin" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold">Processing your donation</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Please wait while we confirm your payment. This usually takes a few seconds.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Donation reference: <span className="font-medium">{orderNumber}</span>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground text-center">
              Do not close this page. You will see your thank you message shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
