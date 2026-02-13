"use client"

import { useState, useCallback, useRef } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { QurbaniTable, type QurbaniCountryRow, type QurbaniTableRef } from "@/components/qurbani-table"
import { QurbaniDonationsTab } from "@/components/qurbani-donations-tab"

export function QurbaniPageClient({
  initialCountries,
}: {
  initialCountries: QurbaniCountryRow[]
}) {
  const [countries, setCountries] = useState<QurbaniCountryRow[]>(initialCountries)
  const [activeTab, setActiveTab] = useState("setup")
  const tableRef = useRef<QurbaniTableRef>(null)

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/qurbani")
    if (res.ok) {
      const data = await res.json()
      setCountries(data)
    }
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
        </TabsList>
        {activeTab === "setup" && (
          <Button onClick={() => tableRef.current?.openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            New country
          </Button>
        )}
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
