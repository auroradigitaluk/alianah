"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { buildDonationConfirmationEmail } from "@/lib/email-templates"

export default function EmailPreviewPage() {
  const [donorName, setDonorName] = React.useState("Muhammad Ali")
  const [orderNumber, setOrderNumber] = React.useState("786-112345678")
  const [giftAid, setGiftAid] = React.useState(true)
  const [includeManageLink, setIncludeManageLink] = React.useState(false)

  const [itemTitle, setItemTitle] = React.useState("Palestine Emergency Relief")
  const [itemAmount, setItemAmount] = React.useState(2500)
  const [itemFrequency, setItemFrequency] = React.useState<string | undefined>(undefined)

  const manageSubscriptionUrl = includeManageLink
    ? "https://example.com/manage-subscription?token=example"
    : undefined

  const email = React.useMemo(() => {
    return buildDonationConfirmationEmail({
      donorName,
      orderNumber,
      items: [
        {
          title: itemTitle,
          amountPence: Number.isFinite(itemAmount) ? itemAmount : 2500,
          ...(itemFrequency ? { frequency: itemFrequency } : {}),
        },
      ],
      totalPence: Number.isFinite(itemAmount) ? itemAmount : 2500,
      giftAid,
      ...(manageSubscriptionUrl ? { manageSubscriptionUrl } : {}),
    })
  }, [donorName, giftAid, itemAmount, itemFrequency, itemTitle, manageSubscriptionUrl, orderNumber])

  const previewSrc = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set("donorName", donorName)
    params.set("orderNumber", orderNumber)
    params.set("itemTitle", itemTitle)
    params.set("amountPence", String(itemAmount))
    if (itemFrequency) params.set("frequency", itemFrequency)
    params.set("giftAid", giftAid ? "1" : "0")
    params.set("includeManageLink", includeManageLink ? "1" : "0")
    return `/admin/email-preview/donation?${params.toString()}`
  }, [donorName, orderNumber, itemTitle, itemAmount, itemFrequency, giftAid, includeManageLink])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Email Preview</h1>
        <p className="text-sm text-muted-foreground">Preview how emails will look before sending.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Donation confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="donorName">Donor name</Label>
              <Input id="donorName" transform="titleCase" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderNumber">Donation reference</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="itemTitle">Item title</Label>
              <Input id="itemTitle" transform="titleCase" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="itemAmount">Amount (pence)</Label>
                <Input
                  id="itemAmount"
                  inputMode="numeric"
                  value={String(itemAmount)}
                  onChange={(e) => setItemAmount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemFrequency">Frequency (optional)</Label>
                <Input
                  id="itemFrequency"
                  placeholder="e.g. MONTHLY"
                  value={itemFrequency ?? ""}
                  onChange={(e) => setItemFrequency(e.target.value || undefined)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Checkbox id="giftAid" checked={giftAid} onCheckedChange={(v) => setGiftAid(v === true)} />
              <Label htmlFor="giftAid" className="font-normal cursor-pointer">
                Gift Aid claimed
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="includeManageLink"
                checked={includeManageLink}
                onCheckedChange={(v) => setIncludeManageLink(v === true)}
              />
              <Label htmlFor="includeManageLink" className="font-normal cursor-pointer">
                Include “Manage subscription” link
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <p className="text-xs text-muted-foreground">Subject: {email.subject}</p>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-background">
              <iframe
                title="Email preview"
                className="w-full h-[75vh]"
                src={previewSrc}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

