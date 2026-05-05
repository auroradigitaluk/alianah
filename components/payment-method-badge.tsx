"use client"

import type { ComponentType } from "react"
import { Badge } from "@/components/ui/badge"
import { IconBuildingBank, IconCash, IconCreditCard, IconTag } from "@tabler/icons-react"
import { formatPaymentMethod } from "@/lib/utils"

/** Maps legacy / alternate API values to canonical payment keys for styling. */
function canonicalPaymentKey(raw: string): string {
  if (raw === "STRIPE" || raw === "PAYPAL") return "WEBSITE_STRIPE"
  if (raw === "CARD") return "CARD_SUMUP"
  return raw
}

const STYLE_BY_KEY: Record<string, string> = {
  CASH: "bg-primary text-primary-foreground border-primary",
  CARD_SUMUP: "bg-orange-500 text-white border-orange-500",
  BANK_TRANSFER: "bg-blue-500 text-white border-blue-500",
  OFFICE_BUCKETS: "bg-purple-500 text-white border-purple-500",
  WEBSITE_STRIPE: "bg-emerald-600 text-white border-emerald-600",
}

export function PaymentMethodBadge({ paymentMethod }: { paymentMethod: string }) {
  const key = canonicalPaymentKey(paymentMethod)
  const styleClass = STYLE_BY_KEY[key]

  let Icon: ComponentType<{ className?: string }> = IconCash
  if (key === "CARD_SUMUP") Icon = IconTag
  else if (key === "BANK_TRANSFER") Icon = IconBuildingBank
  else if (key === "OFFICE_BUCKETS") Icon = IconCash
  else if (key === "WEBSITE_STRIPE") Icon = IconCreditCard

  const label = formatPaymentMethod(paymentMethod)

  if (!styleClass) {
    return (
      <Badge variant="outline" className="px-1.5 text-muted-foreground">
        {label}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={`px-1.5 ${styleClass}`}>
      <Icon className="size-3" />
      {label}
    </Badge>
  )
}
