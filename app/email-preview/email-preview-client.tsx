"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const EMAIL_TYPES = [
  { value: "offline-receipt", label: "Offline Donation Receipt" },
  { value: "online-donation", label: "Online Donation" },
  { value: "collection-receipt", label: "Collection Receipt" },
  { value: "water-donation", label: "Water Project Donation" },
  { value: "sponsorship-donation", label: "Sponsorship Donation" },
  { value: "abandoned-checkout", label: "Abandoned Checkout" },
] as const

export function EmailPreviewClient({
  htmlByType,
}: {
  htmlByType: Record<string, string>
}) {
  const [activeTab, setActiveTab] = React.useState("offline-receipt")
  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Receipt Previews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preview how receipt emails look when sent to donors and masjids.
          </p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
            {EMAIL_TYPES.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {EMAIL_TYPES.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
                <div className="border-b bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {t.label}
                </div>
                <div className="overflow-auto bg-white">
                  {htmlByType[t.value] ? (
                    <iframe
                      title={t.label}
                      srcDoc={htmlByType[t.value]}
                      className="min-h-[60vh] w-full border-0 bg-white"
                      style={{ height: "70vh" }}
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
                      No preview available
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
