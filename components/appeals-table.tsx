"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Copy, Check, FileText, Target, Hash, Wallet, Users, Calendar, Link2, Image as ImageIcon, Settings, TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDateTime, formatPaymentMethod, PAYMENT_METHODS } from "@/lib/utils"
import { AppealsDateFilter } from "@/components/appeals-date-filter"

interface Appeal {
  id: string
  title: string
  slug: string
  summary: string
  heroImageUrl: string | null
  galleryImageUrls: string
  sectionIntro: string
  sectionNeed: string
  sectionFundsUsed: string
  sectionImpact: string
  framerUrl: string | null
  isActive: boolean
  donationTypesEnabled: string
  defaultDonationType: string
  allowMonthly: boolean
  allowYearly: boolean
  allowCustomMonthly: boolean
  allowCustomYearly: boolean
  monthlyPricePence: number | null
  yearlyPricePence: number | null
  allowFundraising: boolean
  appealImageUrls: string
  fundraisingImageUrls: string
  createdAt: Date | string
  updatedAt: Date | string
  donations?: Array<{
    id: string
    amountPence: number
    status: string
    paymentMethod: string
    createdAt: Date | string
  }>
  offlineIncome?: Array<{
    id: string
    amountPence: number
    source: string
    receivedAt: Date | string
  }>
  collections?: Array<{
    id: string
    amountPence: number
    collectedAt: Date | string
  }>
  fundraisers?: Array<{
    id: string
    title: string
    fundraiserName: string
    isActive: boolean
  }>
  products?: Array<never>
}

export function AppealsTable({ appeals }: { appeals: Appeal[] }) {
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [modalDateRange, setModalDateRange] = useState<{ startDate: Date; endDate: Date } | null>(null)

  // Calculate date range from URL params (same logic as server-side)
  const getDateRange = (range: string | null, start?: string | null, end?: string | null) => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // Handle custom range
    if (range === "custom" && start && end) {
      startDate = new Date(start)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(end)
      endDate.setHours(23, 59, 59, 999)
      return { startDate, endDate }
    }

    switch (range) {
      case "this_week": {
        const dayOfWeek = now.getDay()
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        startDate = new Date(now.getFullYear(), now.getMonth(), diff)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        break
      }
      case "last_week": {
        const dayOfWeek = now.getDay()
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
        const lastMonday = new Date(now.getFullYear(), now.getMonth(), diff - 7)
        startDate = new Date(lastMonday)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(lastMonday)
        endDate.setDate(endDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        break
      }
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      case "last_month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        break
      case "90d":
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
        startDate.setHours(0, 0, 0, 0)
        break
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      case "last_year":
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
        break
      default:
        // Default to this month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    return { startDate, endDate }
  }

  // Get current date range - use modal state if available, otherwise default to this month
  const effectiveDateRange = modalDateRange || (() => {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { startDate, endDate }
  })()
  
  const { startDate, endDate } = effectiveDateRange

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
      <Dialog
        open={!!selectedAppeal}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAppeal(null)
            setModalDateRange(null) // Reset date range when modal closes
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedAppeal?.title || "Appeal Details"}
            </DialogTitle>
            <DialogDescription>
              Appeal information and details
            </DialogDescription>
          </DialogHeader>

          {selectedAppeal && (() => {
            // Filter data based on date range
            const allDonations = selectedAppeal.donations || []
            const allOfflineIncome = selectedAppeal.offlineIncome || []
            const allCollections = selectedAppeal.collections || []
            
            // Filter donations by createdAt
            const donations = allDonations.filter(d => {
              const date = new Date(d.createdAt)
              return date >= startDate && date <= endDate
            })
            
            // Filter offline income by receivedAt
            const offlineIncome = allOfflineIncome.filter(d => {
              const date = new Date(d.receivedAt)
              return date >= startDate && date <= endDate
            })
            
            // Filter collections by collectedAt
            const collections = allCollections.filter(d => {
              const date = new Date(d.collectedAt)
              return date >= startDate && date <= endDate
            })
            
            const fundraisers = selectedAppeal.fundraisers || []
            
            const totalDonations = donations
              .filter(d => d.status === "COMPLETED")
              .reduce((sum, d) => sum + d.amountPence, 0)
            const totalOffline = offlineIncome.reduce((sum, d) => sum + d.amountPence, 0)
            const totalCollections = collections.reduce((sum, d) => sum + d.amountPence, 0)
            const totalRaised = totalDonations + totalOffline + totalCollections
            
            // Calculate payment method breakdown
            const completedDonations = donations.filter(d => d.status === "COMPLETED")
            const websiteStripe = completedDonations
              .filter(d => d.paymentMethod === PAYMENT_METHODS.WEBSITE_STRIPE || d.paymentMethod === "STRIPE")
              .reduce((sum, d) => sum + d.amountPence, 0)
            const card = completedDonations
              .filter(d => d.paymentMethod === PAYMENT_METHODS.CARD_SUMUP || d.paymentMethod === "CARD")
              .reduce((sum, d) => sum + d.amountPence, 0)
            const cash = completedDonations
              .filter(d => d.paymentMethod === PAYMENT_METHODS.CASH)
              .reduce((sum, d) => sum + d.amountPence, 0) +
              offlineIncome
                .filter(d => d.source === "CASH")
                .reduce((sum, d) => sum + d.amountPence, 0)
            const bankTransfer = completedDonations
              .filter(d => d.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER)
              .reduce((sum, d) => sum + d.amountPence, 0) +
              offlineIncome
                .filter(d => d.source === "BANK_TRANSFER")
                .reduce((sum, d) => sum + d.amountPence, 0)
            const collectionsTotal = totalCollections
            const donationTypes = selectedAppeal.donationTypesEnabled 
              ? (() => {
                  try {
                    return JSON.parse(selectedAppeal.donationTypesEnabled)
                  } catch {
                    return []
                  }
                })()
              : []
            const appealImages = selectedAppeal.appealImageUrls
              ? (() => {
                  try {
                    return JSON.parse(selectedAppeal.appealImageUrls)
                  } catch {
                    return []
                  }
                })()
              : []
            const fundraisingImages = selectedAppeal.fundraisingImageUrls
              ? (() => {
                  try {
                    return JSON.parse(selectedAppeal.fundraisingImageUrls)
                  } catch {
                    return []
                  }
                })()
              : []

            return (
              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 pt-4 flex items-center justify-between">
                    <TabsList className="gap-2">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                      <TabsTrigger value="statistics">Statistics</TabsTrigger>
                    </TabsList>
                    <AppealsDateFilter onDateRangeChange={setModalDateRange} />
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <TabsContent value="overview" className="space-y-6 mt-0">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="py-2 gap-1">
                          <CardHeader className="pb-0 px-6 pt-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Total Raised
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0">
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRaised)}</p>
                          </CardContent>
                        </Card>
                        <Card className="py-2 gap-1">
                          <CardHeader className="pb-0 px-6 pt-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Online Donations
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0">
                            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalDonations)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {donations.filter(d => d.status === "COMPLETED").length} donations
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="py-2 gap-1">
                          <CardHeader className="pb-0 px-6 pt-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Fundraisers
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0">
                            <p className="text-2xl font-bold text-foreground">{fundraisers.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {fundraisers.filter(f => f.isActive).length} active
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <Separator className="my-6" />

                      {/* Basic Information */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Basic Information</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-0">
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Title
                                </p>
                                <p className="text-base font-semibold text-foreground">{selectedAppeal.title}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Slug
                                </p>
                                <p className="text-base font-mono text-sm text-foreground break-all">{selectedAppeal.slug}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Created
                                </p>
                                <p className="text-base text-foreground">{formatDateTime(selectedAppeal.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-0">
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Target className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Status
                                </p>
                                <StatusBadge isActive={selectedAppeal.isActive} />
                              </div>
                            </div>
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Last Updated
                                </p>
                                <p className="text-base text-foreground">{formatDateTime(selectedAppeal.updatedAt)}</p>
                              </div>
                            </div>
                            {selectedAppeal.summary && (
                              <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Summary
                                  </p>
                                  <p className="text-sm text-foreground line-clamp-3">{selectedAppeal.summary}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-6" />

                      <div className="pt-2">
                        <a
                          href={`/admin/appeals/${selectedAppeal.id}/edit`}
                          className="text-sm text-primary hover:underline"
                        >
                          Edit Appeal →
                        </a>
                      </div>
                    </TabsContent>

                    <TabsContent value="content" className="space-y-6 mt-0">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Content</h3>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Introduction
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAppeal.sectionIntro || "Not set"}</p>
                          </div>
                          <Separator />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              The Need
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAppeal.sectionNeed || "Not set"}</p>
                          </div>
                          <Separator />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              How Funds Are Used
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAppeal.sectionFundsUsed || "Not set"}</p>
                          </div>
                          <Separator />
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Impact
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAppeal.sectionImpact || "Not set"}</p>
                          </div>
                        </div>

                        {(appealImages.length > 0 || selectedAppeal.heroImageUrl) && (
                          <>
                            <Separator className="my-6" />
                            <div>
                              <div className="flex items-center gap-3 pb-2 mb-4">
                                <div className="p-2 rounded-lg bg-muted/50">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Images</h3>
                              </div>
                              {selectedAppeal.heroImageUrl && (
                                <div className="mb-4">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Hero Image
                                  </p>
                                  <a href={selectedAppeal.heroImageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                                    {selectedAppeal.heroImageUrl}
                                  </a>
                                </div>
                              )}
                              {appealImages.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Appeal Images ({appealImages.length})
                                  </p>
                                  <div className="space-y-2">
                                    {appealImages.map((url: string, idx: number) => (
                                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline break-all">
                                        {url}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {fundraisingImages.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Fundraising Images ({fundraisingImages.length})
                                  </p>
                                  <div className="space-y-2">
                                    {fundraisingImages.map((url: string, idx: number) => (
                                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary hover:underline break-all">
                                        {url}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {selectedAppeal.framerUrl && (
                          <>
                            <Separator className="my-6" />
                            <div>
                              <div className="flex items-center gap-3 pb-2 mb-4">
                                <div className="p-2 rounded-lg bg-muted/50">
                                  <Link2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <h3 className="text-base font-bold uppercase tracking-wide text-foreground">External Links</h3>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Framer URL
                                </p>
                                <a href={selectedAppeal.framerUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                                  {selectedAppeal.framerUrl}
                                </a>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6 mt-0">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Donation Settings</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Donation Types Enabled
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {donationTypes.length > 0 ? (
                                  donationTypes.map((type: string) => (
                                    <Badge key={type} variant="secondary">{type}</Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">None</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Default Donation Type
                              </p>
                              <Badge variant="outline">{selectedAppeal.defaultDonationType}</Badge>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Recurring Options
                              </p>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={selectedAppeal.allowMonthly ? "default" : "secondary"}>
                                    {selectedAppeal.allowMonthly ? "✓" : "✗"} Monthly
                                  </Badge>
                                  {selectedAppeal.allowMonthly && selectedAppeal.monthlyPricePence && (
                                    <span className="text-sm text-muted-foreground">
                                      ({formatCurrency(selectedAppeal.monthlyPricePence)})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={selectedAppeal.allowYearly ? "default" : "secondary"}>
                                    {selectedAppeal.allowYearly ? "✓" : "✗"} Yearly
                                  </Badge>
                                  {selectedAppeal.allowYearly && selectedAppeal.yearlyPricePence && (
                                    <span className="text-sm text-muted-foreground">
                                      ({formatCurrency(selectedAppeal.yearlyPricePence)})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={selectedAppeal.allowCustomMonthly ? "default" : "secondary"}>
                                    {selectedAppeal.allowCustomMonthly ? "✓" : "✗"} Custom Monthly
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={selectedAppeal.allowCustomYearly ? "default" : "secondary"}>
                                    {selectedAppeal.allowCustomYearly ? "✓" : "✗"} Custom Yearly
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Fundraising
                              </p>
                              <Badge variant={selectedAppeal.allowFundraising ? "default" : "secondary"}>
                                {selectedAppeal.allowFundraising ? "Enabled" : "Disabled"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="statistics" className="space-y-6 mt-0">
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-2">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Statistics</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Financial Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Online Donations</span>
                                <span className="font-semibold">{formatCurrency(totalDonations)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Offline Income</span>
                                <span className="font-semibold">{formatCurrency(totalOffline)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Collections</span>
                                <span className="font-semibold">{formatCurrency(totalCollections)}</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold">Total Raised</span>
                                <span className="text-lg font-bold">{formatCurrency(totalRaised)}</span>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Activity Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total Donations</span>
                                <span className="font-semibold">{donations.length}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Completed</span>
                                <span className="font-semibold">{donations.filter(d => d.status === "COMPLETED").length}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Fundraisers</span>
                                <span className="font-semibold">{fundraisers.length}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Active Fundraisers</span>
                                <span className="font-semibold">{fundraisers.filter(f => f.isActive).length}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <Separator className="my-6" />

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Payment Method Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{formatPaymentMethod(PAYMENT_METHODS.WEBSITE_STRIPE)}</span>
                              <span className="font-semibold">{formatCurrency(websiteStripe)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{formatPaymentMethod(PAYMENT_METHODS.CARD_SUMUP)}</span>
                              <span className="font-semibold">{formatCurrency(card)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{formatPaymentMethod(PAYMENT_METHODS.CASH)}</span>
                              <span className="font-semibold">{formatCurrency(cash)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">{formatPaymentMethod(PAYMENT_METHODS.BANK_TRANSFER)}</span>
                              <span className="font-semibold">{formatCurrency(bankTransfer)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Collections (Masjid)</span>
                              <span className="font-semibold">{formatCurrency(collectionsTotal)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold">Total</span>
                              <span className="text-lg font-bold">{formatCurrency(totalRaised)}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {fundraisers.length > 0 && (
                          <>
                            <Separator className="my-6" />
                            <div>
                              <div className="flex items-center gap-3 pb-2 mb-4">
                                <div className="p-2 rounded-lg bg-muted/50">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Fundraisers</h3>
                              </div>
                              <div className="space-y-2">
                                {fundraisers.map((fundraiser) => (
                                  <div key={fundraiser.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-foreground">{fundraiser.title}</p>
                                      <p className="text-xs text-muted-foreground">by {fundraiser.fundraiserName}</p>
                                    </div>
                                    <StatusBadge isActive={fundraiser.isActive} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </>
  )
}
