"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrencyWhole } from "@/lib/utils"
import Link from "next/link"
import { Plus, Share2, Pencil, Loader2, ExternalLink, ListOrdered } from "lucide-react"
import { FundraiserDonationsView } from "@/components/fundraiser-donations-view"

interface Fundraiser {
  id: string
  title: string
  slug: string
  fundraiserName: string
  totalRaised: number
  targetAmountPence: number | null
  progressPercentage: number
  donationCount: number
  createdAt: Date
  imageUrl?: string | null
  message?: string | null
  customApprovalStatus?: "PENDING" | "APPROVED" | "DECLINED"
  customDeclineReason?: string | null
  campaign: {
    title: string
    slug: string
    type: "APPEAL" | "WATER" | "QURBANI"
  }
}

interface EligibleCampaign {
  id: string
  title: string
  slug: string
  summary: string | null
  type: "APPEAL" | "WATER"
}

interface FundraiserDashboardClientProps {
  fundraisers: Fundraiser[]
  eligibleCampaigns: EligibleCampaign[]
}

export function FundraiserDashboardClient({
  fundraisers,
  eligibleCampaigns,
}: FundraiserDashboardClientProps) {
  const router = useRouter()
  const [selectedFundraiserId, setSelectedFundraiserId] = useState<string | null>(null)
  const [selectedFundraiserTitle, setSelectedFundraiserTitle] = useState<string>("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingFundraiser, setEditingFundraiser] = useState<Fundraiser | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editName, setEditName] = useState("")
  const [editTargetPounds, setEditTargetPounds] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const handleFundraiserClick = (fundraiser: Fundraiser) => {
    setSelectedFundraiserId(fundraiser.id)
    setSelectedFundraiserTitle(fundraiser.title)
    setSidebarOpen(true)
  }

  const openEditModal = (f: Fundraiser) => {
    setEditingFundraiser(f)
    setEditTitle(f.title)
    setEditName(f.fundraiserName || "")
    setEditTargetPounds(
      f.targetAmountPence != null && f.targetAmountPence > 0
        ? (f.targetAmountPence / 100).toFixed(2)
        : ""
    )
    setEditMessage(f.message || "")
    setEditError("")
  }

  const closeEditModal = () => {
    setEditingFundraiser(null)
    setEditError("")
  }

  const handleEditSave = async () => {
    if (!editingFundraiser) return
    const targetPence =
      editTargetPounds.trim() === ""
        ? null
        : Math.round(parseFloat(editTargetPounds) * 100)
    if (editTargetPounds.trim() !== "" && (targetPence == null || targetPence < 1)) {
      setEditError("Enter a valid target amount")
      return
    }
    if (!editTitle.trim()) {
      setEditError("Title is required")
      return
    }
    if (!editName.trim()) {
      setEditError("Your name is required")
      return
    }
    setEditSaving(true)
    setEditError("")
    try {
      const res = await fetch(`/api/fundraisers/${editingFundraiser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          fundraiserName: editName.trim(),
          targetAmountPence: targetPence,
          message: editMessage.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || data.error || "Failed to update")
      }
      router.refresh()
      closeEditModal()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setEditSaving(false)
    }
  }

  const handleShare = (slug: string) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/fundraise/${slug}` : ""
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug(null), 2000)
    })
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                My Fundraisers
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Manage all your fundraising campaigns
              </p>
            </div>
            <Button asChild size="lg" className="gap-2 shrink-0">
              <Link href="/fundraiser/create">
                <Plus className="h-4 w-4" />
                Create New Fundraiser
              </Link>
            </Button>
          </div>

          {/* Fundraisers List */}
          {fundraisers.length === 0 ? (
            <Card className="!bg-transparent shadow-none hover:shadow-none">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t created any fundraisers yet.
                </p>
                {eligibleCampaigns.length > 0 && (
                  <Button asChild>
                    <Link href="/fundraiser/create">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Fundraiser
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {fundraisers.map((fundraiser) => {
                const imageSrc =
                  (typeof fundraiser.imageUrl === "string" && fundraiser.imageUrl.trim()) ||
                  "https://sp-ao.shortpixel.ai/client/to_webp,q_glossy,ret_img,w_3000/https://alianah.org/wp-content/uploads/2025/05/4-1.webp"

                return (
                <Card
                  key={fundraiser.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-lg hover:shadow-xl transition-shadow pt-0 pb-4 gap-0"
                >
                  <div className="relative aspect-[4/3] w-full bg-muted shrink-0">
                    <Image
                      src={imageSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <CardContent className="p-4 text-left">
                    <h3 className="font-semibold text-foreground mb-3 line-clamp-2 min-h-[2.5em] leading-tight">
                      {fundraiser.title}
                    </h3>
                    {fundraiser.customApprovalStatus === "PENDING" && (
                      <p className="mb-2 text-xs font-medium text-amber-600">
                        Pending admin approval
                      </p>
                    )}
                    {fundraiser.customApprovalStatus === "DECLINED" && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-destructive">Declined by admin</p>
                        {fundraiser.customDeclineReason ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reason: {fundraiser.customDeclineReason}
                          </p>
                        ) : null}
                      </div>
                    )}
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-2 text-base text-white mb-1.5">
                        <span className="font-semibold">
                          {formatCurrencyWhole(fundraiser.totalRaised)} raised
                        </span>
                        {fundraiser.targetAmountPence != null && fundraiser.targetAmountPence > 0 && (
                          <span className="font-medium">
                            of {formatCurrencyWhole(fundraiser.targetAmountPence)}
                          </span>
                        )}
                      </div>
                      {fundraiser.targetAmountPence != null && fundraiser.targetAmountPence > 0 && (
                        <Progress
                          value={Math.min(fundraiser.progressPercentage, 100)}
                          className="h-2 bg-muted"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="w-full h-11 font-semibold gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        size="lg"
                        onClick={() => openEditModal(fundraiser)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full h-11 gap-2"
                        onClick={() => handleShare(fundraiser.slug)}
                      >
                        <Share2 className="h-4 w-4" />
                        {copiedSlug === fundraiser.slug ? "Copied!" : "Share"}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full h-11 gap-2"
                        asChild
                      >
                        <Link
                          href={`/fundraise/${fundraiser.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View page
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full h-11 gap-2"
                        asChild
                      >
                        <Link
                          href={`/fundraiser/donations?fundraiserId=${fundraiser.id}`}
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <ListOrdered className="h-4 w-4" />
                          View donations
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          )}
        </div>
      </div>

      <FundraiserDonationsView
        fundraiserId={selectedFundraiserId}
        fundraiserTitle={selectedFundraiserTitle}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />

      <Dialog open={!!editingFundraiser} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit fundraiser</DialogTitle>
            <DialogDescription>
              Update the title, your name, target amount, or message.
            </DialogDescription>
          </DialogHeader>
          {editingFundraiser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Campaign title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. John is fundraising for Palestine Appeal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Your name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  transform="titleCase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-target">Target amount (£)</Label>
                <Input
                  id="edit-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editTargetPounds}
                  onChange={(e) => setEditTargetPounds(e.target.value)}
                  placeholder="Leave empty for no target"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-message">Why are you fundraising? (optional)</Label>
                <Textarea
                  id="edit-message"
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Share your story..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
