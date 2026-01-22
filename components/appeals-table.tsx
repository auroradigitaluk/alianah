"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { DetailModal } from "@/components/detail-modal"

interface Appeal {
  id: string
  title: string
  slug: string
  isActive: boolean
}

export function AppealsTable({ appeals }: { appeals: Appeal[] }) {
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)

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
