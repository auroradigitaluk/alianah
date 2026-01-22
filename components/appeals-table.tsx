"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Copy, Check } from "lucide-react"
import { DetailModal } from "@/components/detail-modal"

interface Appeal {
  id: string
  title: string
  slug: string
  isActive: boolean
}

export function AppealsTable({ appeals }: { appeals: Appeal[] }) {
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const getAppealUrl = (slug: string) => {
    const baseUrl = typeof window !== "undefined" 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    return `${baseUrl}/appeal/${slug}`
  }

  const handleCopyLink = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = getAppealUrl(slug)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <>
      <AdminTable
        data={appeals}
        onRowClick={(appeal) => setSelectedAppeal(appeal)}
        columns={[
        {
          id: "title",
          header: "Header",
          cell: (appeal) => (
            <div className="font-medium">{appeal.title}</div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (appeal) => <StatusBadge isActive={appeal.isActive} />,
        },
        {
          id: "appealLink",
          header: "View",
          cell: (appeal) => (
            <Link
              href={`/appeal/${appeal.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ),
        },
        {
          id: "copyLink",
          header: "Copy Link",
          cell: (appeal) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleCopyLink(appeal.slug, e)}
              className="h-8 w-8 p-0"
              title="Copy appeal link"
            >
              {copiedSlug === appeal.slug ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedAppeal}
        onOpenChange={(open) => !open && setSelectedAppeal(null)}
        title={selectedAppeal?.title || "Appeal Details"}
      >
        {selectedAppeal && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</h3>
              <p className="text-base font-semibold">{selectedAppeal.title}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h3>
              <StatusBadge isActive={selectedAppeal.isActive} />
            </div>
            <div className="pt-2">
              <a
                href={`/admin/appeals/${selectedAppeal.id}/edit`}
                className="text-sm text-primary hover:underline"
              >
                Edit Appeal →
              </a>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
