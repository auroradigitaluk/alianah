import { Suspense } from "react"
import { ManageSubscriptionClient } from "@/app/(public)/manage-subscription/manage-subscription-client"

export const dynamic = "force-dynamic"

export default function ManageSubscriptionPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:px-6" />}>
      <ManageSubscriptionClient />
    </Suspense>
  )
}

