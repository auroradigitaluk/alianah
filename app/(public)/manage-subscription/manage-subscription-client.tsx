"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export function ManageSubscriptionClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const done = searchParams.get("done")

  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    async function go() {
      if (!token) return
      setLoading(true)
      try {
        const res = await fetch("/api/stripe/portal-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Failed to open portal")
        if (!data.url) throw new Error("Missing portal URL")
        window.location.assign(data.url as string)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to open portal")
      } finally {
        setLoading(false)
      }
    }
    void go()
  }, [token])

  return (
    <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:px-6">
      <div className="max-w-lg mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Manage subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {done === "1" && (
              <p className="text-sm text-muted-foreground">
                You can close this page.
              </p>
            )}

            {token ? (
              <p className="text-sm text-muted-foreground">
                {loading ? "Opening secure Stripe portal..." : "Redirecting..."}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Please use the secure link from your donation confirmation email to manage your subscription.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

