"use client"

import { useState, useCallback, useRef } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { QurbaniTable, type QurbaniCountryRow, type QurbaniTableRef } from "@/components/qurbani-table"
import { QurbaniDonationsTab } from "@/components/qurbani-donations-tab"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export function QurbaniPageClient({
  initialCountries,
  initialQurbaniEnabled,
}: {
  initialCountries: QurbaniCountryRow[]
  initialQurbaniEnabled: boolean
}) {
  const [countries, setCountries] = useState<QurbaniCountryRow[]>(initialCountries)
  const [activeTab, setActiveTab] = useState("setup")
  const [qurbaniEnabled, setQurbaniEnabled] = useState<boolean>(initialQurbaniEnabled)
  const [savingToggle, setSavingToggle] = useState(false)
  const tableRef = useRef<QurbaniTableRef>(null)

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/qurbani")
    if (res.ok) {
      const data = await res.json()
      setCountries(data)
    }
  }, [])

  const handleToggleQurbani = useCallback(
    async (checked: boolean) => {
      setQurbaniEnabled(checked)
      setSavingToggle(true)
      try {
        const res = await fetch("/api/admin/settings/qurbani", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qurbaniEnabled: checked }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const msg =
            typeof data?.error === "string" && data.error.trim()
              ? data.error
              : "Failed to update qurbani visibility"
          throw new Error(msg)
        }
      } catch (error) {
        setQurbaniEnabled((prev) => !prev)
        toast.error(error instanceof Error ? error.message : "Failed to update qurbani visibility")
      } finally {
        setSavingToggle(false)
      }
    },
    []
  )

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Qurbani</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Set up qurbani donation options by country (1/7th, Small, Large) and view donations
          </p>
        </div>
        {activeTab === "setup" && (
          <Button onClick={() => tableRef.current?.openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            New country
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <Switch checked={qurbaniEnabled} onCheckedChange={handleToggleQurbani} disabled={savingToggle} />
          <Label className="text-sm">{qurbaniEnabled ? "Qurbani is live" : "Qurbani is hidden"}</Label>
        </div>
      </div>
      <TabsContent value="setup" className="mt-0">
        <QurbaniTable ref={tableRef} countries={countries} onRefresh={refresh} showNewButton={false} />
      </TabsContent>
      <TabsContent value="donations" className="mt-0">
        <QurbaniDonationsTab />
      </TabsContent>
    </Tabs>
  )
}
