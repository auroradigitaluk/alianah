"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SecurityTab } from "@/components/settings/security-tab"
import { toast } from "sonner"

type OrganizationSettings = {
  charityName: string
  supportEmail: string
  websiteUrl: string
  charityNumber: string | null
}

export function SettingsPageClient() {
  const [org, setOrg] = React.useState<OrganizationSettings | null>(null)
  const [orgLoading, setOrgLoading] = React.useState(true)
  const [orgSaving, setOrgSaving] = React.useState(false)
  const [orgForm, setOrgForm] = React.useState<OrganizationSettings>({
    charityName: "",
    supportEmail: "",
    websiteUrl: "",
    charityNumber: null,
  })

  React.useEffect(() => {
    fetch("/api/admin/settings/organization")
      .then((res) => res.json())
      .then((data) => {
        setOrg(data)
        setOrgForm({
          charityName: data.charityName ?? "",
          supportEmail: data.supportEmail ?? "",
          websiteUrl: data.websiteUrl ?? "",
          charityNumber: data.charityNumber ?? null,
        })
      })
      .catch(() => setOrg(null))
      .finally(() => setOrgLoading(false))
  }, [])

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgForm.charityName.trim() || !orgForm.supportEmail.trim() || !orgForm.websiteUrl.trim()) {
      toast.error("Charity name, support email, and website URL are required")
      return
    }
    setOrgSaving(true)
    try {
      const res = await fetch("/api/admin/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charityName: orgForm.charityName.trim(),
          supportEmail: orgForm.supportEmail.trim(),
          websiteUrl: orgForm.websiteUrl.trim(),
          charityNumber: orgForm.charityNumber?.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `Failed to save (${res.status})`)
      }
      setOrg(data)
      toast.success("Organization settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save organization settings")
    } finally {
      setOrgSaving(false)
    }
  }

  return (
    <Tabs defaultValue="organization" className="flex flex-col gap-4">
      <TabsList className="w-fit">
        <TabsTrigger value="organization">Organization</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>
      <TabsContent value="organization" className="mt-0">
        <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
          <p className="text-xs text-muted-foreground">
            Charity branding and contact info used in emails and across the app.
          </p>
        </CardHeader>
        <CardContent>
          {orgLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={handleOrgSave} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="charityName">Charity name</Label>
                <Input
                  id="charityName"
                  transform="titleCase"
                  value={orgForm.charityName}
                  onChange={(e) =>
                    setOrgForm((p) => ({ ...p, charityName: e.target.value }))
                  }
                  placeholder="Alianah Humanity Welfare"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={orgForm.supportEmail}
                  onChange={(e) =>
                    setOrgForm((p) => ({ ...p, supportEmail: e.target.value }))
                  }
                  placeholder="support@alianah.org"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={orgForm.websiteUrl}
                  onChange={(e) =>
                    setOrgForm((p) => ({ ...p, websiteUrl: e.target.value }))
                  }
                  placeholder="https://www.alianah.org"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="charityNumber">Charity number (optional)</Label>
                <Input
                  id="charityNumber"
                  value={orgForm.charityNumber ?? ""}
                  onChange={(e) =>
                    setOrgForm((p) => ({
                      ...p,
                      charityNumber: e.target.value || null,
                    }))
                  }
                  placeholder="e.g. 1234567"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={orgSaving}>
                  {orgSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      </TabsContent>
      <TabsContent value="security" className="mt-0">
        <SecurityTab />
      </TabsContent>
    </Tabs>
  )
}
