"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { formatDateTime } from "@/lib/utils"

type ArchivedAppeal = {
  id: string
  title: string
  slug: string
  archivedAt: Date | string | null
}

type ArchivedAppealsModalProps = {
  appeals: ArchivedAppeal[]
  variant?: "modal" | "inline"
}

export function ArchivedAppealsModal({ appeals, variant = "modal" }: ArchivedAppealsModalProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [loadingId, setLoadingId] = React.useState<string | null>(null)

  const handleUnarchive = async (appealId: string) => {
    try {
      setLoadingId(appealId)
      const res = await fetch(`/api/admin/appeals/${appealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to unarchive appeal")
      }
      router.refresh()
      // Ensure list/count updates immediately
      setTimeout(() => window.location.reload(), 50)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to unarchive appeal")
    } finally {
      setLoadingId(null)
    }
  }

  const archivedCount = appeals.length

  const renderAppeals = () => {
    if (archivedCount === 0) {
      return <div className="text-sm text-muted-foreground">No archived appeals.</div>
    }

    return (
      <div className="space-y-2">
        {appeals.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{a.title}</div>
              <div className="text-xs text-muted-foreground">
                /appeal/{a.slug} • archived {formatDateTime(a.archivedAt)}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={loadingId === a.id}
              onClick={() => handleUnarchive(a.id)}
            >
              {loadingId === a.id ? "Unarchiving..." : "Unarchive"}
            </Button>
          </div>
        ))}
      </div>
    )
  }

  if (variant === "inline") {
    return <>{renderAppeals()}</>
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Show Archived ({archivedCount})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">Archived Appeals</DialogTitle>
            <DialogDescription>
              Unarchive an appeal to make it available again.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">{renderAppeals()}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}

