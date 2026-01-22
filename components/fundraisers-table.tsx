"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { DetailModal } from "@/components/detail-modal"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { ExternalLink, Eye, EyeOff } from "lucide-react"

interface Fundraiser {
  id: string
  title: string
  slug: string
  fundraiserName: string
  email?: string
  isActive: boolean
  appeal: { title: string }
  amountRaised: number
}

export function FundraisersTable({ fundraisers }: { fundraisers: Fundraiser[] }) {
  const router = useRouter()
  const [selectedFundraiser, setSelectedFundraiser] = useState<Fundraiser | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const handleToggleStatus = async (fundraiser: Fundraiser, e: React.MouseEvent) => {
    e.stopPropagation()
    setUpdating(fundraiser.id)
    try {
      const response = await fetch(`/api/admin/fundraisers/${fundraiser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !fundraiser.isActive }),
      })

      if (!response.ok) {
        throw new Error("Failed to update fundraiser")
      }

      router.refresh()
    } catch (error) {
      console.error(error)
      alert("Failed to update fundraiser status")
    } finally {
      setUpdating(null)
    }
  }

  const handleViewPage = (fundraiser: Fundraiser, e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`/fundraise/${fundraiser.slug}`, "_blank")
  }

  return (
    <>
      <AdminTable
        data={fundraisers}
        onRowClick={(fundraiser) => setSelectedFundraiser(fundraiser)}
        columns={[
        {
          id: "title",
          header: "Title",
          cell: (fundraiser) => (
            <div className="font-medium">{fundraiser.title}</div>
          ),
        },
        {
          id: "campaign",
          header: "Appeal",
          cell: (fundraiser) => (
            <div className="text-sm">{fundraiser.appeal.title}</div>
          ),
        },
        {
          id: "fundraiser",
          header: "Fundraiser",
          cell: (fundraiser) => (
            <div className="text-sm">{fundraiser.fundraiserName}</div>
          ),
        },
        {
          id: "amountRaised",
          header: "Amount Raised",
          cell: (fundraiser) => (
            <div className="font-medium">{formatCurrency(fundraiser.amountRaised)}</div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (fundraiser) => <StatusBadge isActive={fundraiser.isActive} />,
        },
        {
          id: "actions",
          header: "Actions",
          cell: (fundraiser) => (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleViewPage(fundraiser, e)}
                className="h-8"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleToggleStatus(fundraiser, e)}
                disabled={updating === fundraiser.id}
                className="h-8"
              >
                {fundraiser.isActive ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          ),
          enableSorting: false,
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedFundraiser}
        onOpenChange={(open) => !open && setSelectedFundraiser(null)}
        title={selectedFundraiser?.title || "Fundraiser Details"}
      >
        {selectedFundraiser && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign</h3>
              <p className="text-base font-semibold">{selectedFundraiser.appeal.title}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fundraiser Name</h3>
              <p className="text-base">{selectedFundraiser.fundraiserName}</p>
            </div>
            {selectedFundraiser.email && (
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</h3>
                <p className="text-base">{selectedFundraiser.email}</p>
              </div>
            )}
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fundraiser Title</h3>
              <p className="text-base">{selectedFundraiser.title}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Slug</h3>
              <p className="text-base font-mono text-sm">{selectedFundraiser.slug}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount Raised</h3>
              <p className="text-2xl font-semibold">{formatCurrency(selectedFundraiser.amountRaised)}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</h3>
              <StatusBadge isActive={selectedFundraiser.isActive} />
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
