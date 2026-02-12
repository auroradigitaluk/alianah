"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatEnum, formatDate, formatDateTime, formatDonorName, formatPaymentMethod, displayDonorEmail } from "@/lib/utils"
import { ExternalLink, Eye, EyeOff, Trash2, Calendar, Target, TrendingUp, Users, Gift, Mail, User, Hash, MessageSquare, Megaphone, FileText, Download, Pencil } from "lucide-react"
import { IconCheck, IconX, IconCircleCheckFilled, IconLoader } from "@tabler/icons-react"

interface Fundraiser {
  id: string
  title: string
  slug: string
  fundraiserName: string
  email?: string
  isActive: boolean
  campaign: { title: string; type: "APPEAL" | "WATER" }
  amountRaised: number
}

interface FundraiserDetails {
  id: string
  title: string
  slug: string
  fundraiserName: string
  email: string
  message: string | null
  targetAmountPence: number | null
  isActive: boolean
  createdAt: string
  campaign: {
    id: string
    title: string
    slug: string
    summary: string | null
    isActive: boolean
    type: "APPEAL" | "WATER"
  }
  statistics: {
    totalRaised: number
    donationCount: number
    averageDonation: number
    progressPercentage: number
    targetAmountPence: number | null
    donationsByType: Record<string, number>
    donationsByPaymentMethod: Record<string, number>
    giftAidCount: number
    giftAidPercentage: number
  }
  donations: Donation[]
}

interface Donation {
  id: string
  amountPence: number
  donationType: string
  frequency: string
  status: string
  paymentMethod: string
  giftAid: boolean
  transactionId: string | null
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  createdAt: string
  completedAt: string | null
  donor: {
    firstName: string
    lastName: string
    email: string
    title?: string | null
  }
  appeal?: {
    title: string
  } | null
  product?: {
    name: string
  } | null
}

interface FundraisersTableProps {
  fundraisers: Fundraiser[]
  initialSelectedId?: string | null
  onSelectionClear?: () => void
}

export function FundraisersTable({
  fundraisers,
  initialSelectedId = null,
  onSelectionClear,
}: FundraisersTableProps) {
  const router = useRouter()
  const [selectedFundraiser, setSelectedFundraiser] = useState<Fundraiser | null>(null)
  const [fundraiserDetails, setFundraiserDetails] = useState<FundraiserDetails | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [appealQuery, setAppealQuery] = useState("")
  const [fundraiserQuery, setFundraiserQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [savingDetails, setSavingDetails] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (initialSelectedId) {
      const match = fundraisers.find((f) => f.id === initialSelectedId) ?? null
      setSelectedFundraiser(match)
    }
  }, [initialSelectedId, fundraisers])

  const filteredFundraisers = useMemo(() => {
    const normalizedAppeal = appealQuery.trim().toLowerCase()
    const normalizedFundraiser = fundraiserQuery.trim().toLowerCase()

    return fundraisers.filter((fundraiser) => {
      const appealName = fundraiser.campaign.title.toLowerCase()
      const fundraiserName = `${fundraiser.fundraiserName} ${fundraiser.title}`.toLowerCase()
      const matchesAppeal = normalizedAppeal
        ? appealName.includes(normalizedAppeal)
        : true
      const matchesFundraiser = normalizedFundraiser
        ? fundraiserName.includes(normalizedFundraiser)
        : true
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && fundraiser.isActive) ||
        (statusFilter === "inactive" && !fundraiser.isActive)

      return matchesAppeal && matchesFundraiser && matchesStatus
    })
  }, [appealQuery, fundraiserQuery, fundraisers, statusFilter])

  const clearFilters = () => {
    setAppealQuery("")
    setFundraiserQuery("")
    setStatusFilter("all")
  }

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

  const handleDelete = async (fundraiser: Fundraiser, e: React.MouseEvent) => {
    e.stopPropagation()
    if (
      !window.confirm(
        "Remove this fundraiser? The page link will stop working. Donations and donor data will be kept."
      )
    ) {
      return
    }
    setDeletingId(fundraiser.id)
    try {
      const response = await fetch(`/api/admin/fundraisers/${fundraiser.id}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to delete fundraiser")
      }
      if (selectedFundraiser?.id === fundraiser.id) {
        setSelectedFundraiser(null)
        setFundraiserDetails(null)
        setIsEditingDetails(false)
        onSelectionClear?.()
      }
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to delete fundraiser")
    } finally {
      setDeletingId(null)
    }
  }

  const startEditingDetails = () => {
    if (fundraiserDetails) {
      setEditName(fundraiserDetails.fundraiserName)
      setEditEmail(fundraiserDetails.email)
      setEditMessage(fundraiserDetails.message ?? "")
      setEditError(null)
      setIsEditingDetails(true)
    }
  }

  const cancelEditingDetails = () => {
    setIsEditingDetails(false)
    setEditError(null)
  }

  const saveDetails = async () => {
    if (!selectedFundraiser || !fundraiserDetails) return
    const name = editName.trim()
    const email = editEmail.trim()
    if (!name || !email) {
      setEditError("Name and email are required.")
      return
    }
    setSavingDetails(true)
    setEditError(null)
    try {
      const response = await fetch(`/api/admin/fundraisers/${selectedFundraiser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundraiserName: name,
          email,
          message: editMessage.trim() || null,
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to update")
      }
      setIsEditingDetails(false)
      await fetchFundraiserDetails()
      router.refresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSavingDetails(false)
    }
  }

  useEffect(() => {
    if (selectedFundraiser) {
      fetchFundraiserDetails()
    } else {
      setFundraiserDetails(null)
    }
  }, [selectedFundraiser])

  const fetchFundraiserDetails = async () => {
    if (!selectedFundraiser) return

    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/admin/fundraisers/${selectedFundraiser.id}`)
      
      if (!response.ok) {
        let errorMessage = `Failed to fetch fundraiser details: ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
          console.error("API Error:", errorData)
        } catch (jsonError) {
          // Response might not be JSON
          const text = await response.text()
          console.error("API Error (non-JSON):", text || `Status ${response.status}`)
          errorMessage = text || errorMessage
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      setFundraiserDetails(data)
    } catch (error) {
      console.error("Error fetching fundraiser details:", error)
      setFundraiserDetails(null)
      // Optionally show a user-friendly error message
      alert(error instanceof Error ? error.message : "Failed to load fundraiser details")
    } finally {
      setLoadingDetails(false)
    }
  }

  const exportDonationsToCSV = () => {
    if (!fundraiserDetails || fundraiserDetails.donations.length === 0) return

    // CSV headers
    const headers = [
      "Donor First Name",
      "Donor Last Name",
      "Donor Email",
      "Amount",
      "Status",
      "Date",
      "Payment Method",
      "Type",
      "Gift Aid",
      "Billing Address",
      "Billing City",
      "Billing Postcode",
      "Billing Country",
      "Transaction ID",
    ]

    // Convert donations to CSV rows
    const rows = fundraiserDetails.donations.map((donation) => {
      const amount = formatCurrency(donation.amountPence)
      const status = formatEnum(donation.status)
      const date = formatDate(
        donation.completedAt ? new Date(donation.completedAt) : new Date(donation.createdAt)
      )
      const paymentMethod = formatPaymentMethod(donation.paymentMethod)
      const donationType = formatEnum(donation.donationType)
      const giftAid = donation.giftAid ? "Yes" : "No"
      const billingAddress = donation.billingAddress || ""
      const billingCity = donation.billingCity || ""
      const billingPostcode = donation.billingPostcode || ""
      const billingCountry = donation.billingCountry || ""
      const transactionId = donation.transactionId || ""

      return [
        donation.donor.firstName,
        donation.donor.lastName,
        displayDonorEmail(donation.donor.email),
        amount,
        status,
        date,
        paymentMethod,
        donationType,
        giftAid,
        billingAddress,
        billingCity,
        billingPostcode,
        billingCountry,
        transactionId,
      ]
    })

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `donations-${fundraiserDetails.fundraiserName}-${new Date().toISOString().split("T")[0]}.csv`
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fundraisers-appeal">Campaign</Label>
            <Input
              id="fundraisers-appeal"
              transform="titleCase"
              placeholder="Search campaign"
              value={appealQuery}
              onChange={(event) => setAppealQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fundraisers-name">Fundraiser or title</Label>
            <Input
              id="fundraisers-name"
              transform="titleCase"
              placeholder="Search fundraiser"
              value={fundraiserQuery}
              onChange={(event) => setFundraiserQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
      <AdminTable
        data={filteredFundraisers}
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
            header: "Campaign",
            cell: (fundraiser) => (
              <div className="text-sm">{fundraiser.campaign.title}</div>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDelete(fundraiser, e)}
                  disabled={deletingId === fundraiser.id}
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete fundraiser (keeps donations)"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
            enableSorting: false,
          },
        ]}
        enableSelection={false}
      />

      <Dialog
        open={!!selectedFundraiser}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFundraiser(null)
            setIsEditingDetails(false)
            onSelectionClear?.()
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedFundraiser?.title || "Fundraiser Details"}
            </DialogTitle>
            <DialogDescription>
              Comprehensive overview of fundraiser information and donations
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="px-6 py-6 space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
          ) : fundraiserDetails ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="donations">
                      Donations ({fundraiserDetails.statistics.donationCount})
                    </TabsTrigger>
                    <TabsTrigger value="statistics">Statistics</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Raised
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(fundraiserDetails.statistics.totalRaised)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Donations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold">
                            {fundraiserDetails.statistics.donationCount}
                          </div>
                        </CardContent>
                      </Card>
                      {fundraiserDetails.targetAmountPence && (
                        <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-purple-500/5 via-card to-card border-purple-500/20">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                          <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              Progress
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-3 pt-0 relative z-10">
                            <div className="text-2xl font-bold">
                              {fundraiserDetails.statistics.progressPercentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              of {formatCurrency(fundraiserDetails.targetAmountPence)}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <Separator className="my-6" />

                    {/* Fundraiser Information */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between gap-3 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Fundraiser Information</h3>
                        </div>
                        {!isEditingDetails && (
                          <Button variant="outline" size="sm" onClick={startEditingDetails}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit name, email or summary
                          </Button>
                        )}
                      </div>

                      {isEditingDetails ? (
                        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                          {editError && (
                            <p className="text-sm text-destructive">{editError}</p>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-fundraiser-name">Fundraiser name</Label>
                              <Input
                                id="edit-fundraiser-name"
                                transform="titleCase"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Display name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-fundraiser-email">Email</Label>
                              <Input
                                id="edit-fundraiser-email"
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="email@example.com"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-fundraiser-message">Summary / message</Label>
                            <Textarea
                              id="edit-fundraiser-message"
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                              placeholder="Optional message shown on the fundraiser page"
                              rows={4}
                              className="resize-y"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={saveDetails} disabled={savingDetails}>
                              {savingDetails ? "Saving…" : "Save changes"}
                            </Button>
                            <Button variant="outline" onClick={cancelEditingDetails} disabled={savingDetails}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-0">
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Fundraiser Name
                                </p>
                                <p className="text-base font-semibold text-foreground">{fundraiserDetails.fundraiserName}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Email
                                </p>
                                <p className="text-base text-foreground break-all">{fundraiserDetails.email}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Slug
                                </p>
                                <p className="text-base font-mono text-sm text-foreground break-all">{fundraiserDetails.slug}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-0">
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <Target className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Status
                                </p>
                                <StatusBadge isActive={fundraiserDetails.isActive} />
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
                                <p className="text-base text-foreground">{formatDate(new Date(fundraiserDetails.createdAt))}</p>
                              </div>
                            </div>
                          </div>
                          
                          {(fundraiserDetails.message ?? "").trim() ? (
                            <div className="md:col-span-2 pt-2">
                              <div className="flex items-start gap-4 py-4 px-4 rounded-lg bg-muted/20 border border-border/50">
                                <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Message
                                  </p>
                                  <p className="text-base text-foreground leading-relaxed">{fundraiserDetails.message}</p>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <Separator className="my-6" />

                    {/* Appeal Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Megaphone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Campaign</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Campaign Title
                              </p>
                              <p className="text-base font-semibold text-foreground">{fundraiserDetails.campaign.title}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Target className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Campaign Status
                              </p>
                              <StatusBadge isActive={fundraiserDetails.campaign.isActive} />
                            </div>
                          </div>
                        </div>
                        
                        {fundraiserDetails.campaign.summary && (
                          <div className="md:col-span-2 pt-2">
                            <div className="flex items-start gap-4 py-4 px-4 rounded-lg bg-muted/20 border border-border/50">
                              <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  Summary
                                </p>
                                <p className="text-base text-foreground leading-relaxed">{fundraiserDetails.campaign.summary}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="donations" className="mt-0">
                    {fundraiserDetails.donations.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No donations yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button onClick={exportDonationsToCSV} variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                          </Button>
                        </div>
                        <div className="rounded-md border">
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Donor</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Payment Method</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Gift Aid</TableHead>
                              <TableHead>Billing Address</TableHead>
                              <TableHead>Transaction ID</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fundraiserDetails.donations.map((donation) => (
                              <TableRow key={donation.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {formatDonorName(donation.donor)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {displayDonorEmail(donation.donor.email)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-semibold">
                                    {formatCurrency(donation.amountPence)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={donation.status === "COMPLETED" ? "default" : "outline"}
                                    className="px-1.5"
                                  >
                                    {donation.status === "COMPLETED" ? (
                                      <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
                                    ) : (
                                      <IconLoader className="mr-1 size-3" />
                                    )}
                                    {formatEnum(donation.status)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {formatDate(
                                      donation.completedAt
                                        ? new Date(donation.completedAt)
                                        : new Date(donation.createdAt)
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{formatPaymentMethod(donation.paymentMethod)}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{formatEnum(donation.donationType)}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {donation.giftAid ? (
                                      <>
                                        <IconCheck className="h-4 w-4 text-primary" />
                                        <span className="text-sm">Yes</span>
                                      </>
                                    ) : (
                                      <>
                                        <IconX className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">No</span>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {donation.billingAddress ? (
                                    <div className="text-xs max-w-[150px]">
                                      <div className="font-medium truncate" title={donation.billingAddress}>
                                        {donation.billingAddress}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {donation.billingCity && `${donation.billingCity}, `}
                                        {donation.billingPostcode} {donation.billingCountry}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {donation.transactionId ? (
                                    <div className="font-mono text-xs max-w-[120px] truncate" title={donation.transactionId}>
                                      {donation.transactionId}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="statistics" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Donation Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Raised</span>
                            <span className="font-semibold">
                              {formatCurrency(fundraiserDetails.statistics.totalRaised)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Donations</span>
                            <span className="font-semibold">
                              {fundraiserDetails.statistics.donationCount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Average Donation</span>
                            <span className="font-semibold">
                              {formatCurrency(Math.round(fundraiserDetails.statistics.averageDonation))}
                            </span>
                          </div>
                          {fundraiserDetails.targetAmountPence && (
                            <>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Target Amount</span>
                                <span className="font-semibold">
                                  {formatCurrency(fundraiserDetails.targetAmountPence)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Progress</span>
                                <span className="font-semibold">
                                  {fundraiserDetails.statistics.progressPercentage.toFixed(1)}%
                                </span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">By Donation Type</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {Object.entries(fundraiserDetails.statistics.donationsByType).length > 0 ? (
                            Object.entries(fundraiserDetails.statistics.donationsByType).map(
                              ([type, amount]) => (
                                <div key={type} className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">
                                    {formatEnum(type)}
                                  </span>
                                  <span className="font-semibold">{formatCurrency(amount)}</span>
                                </div>
                              )
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground">No data</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">By Payment Method</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {Object.entries(fundraiserDetails.statistics.donationsByPaymentMethod).length >
                          0 ? (
                            Object.entries(fundraiserDetails.statistics.donationsByPaymentMethod).map(
                              ([method, amount]) => (
                                <div key={method} className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">
                                    {formatEnum(method)}
                                  </span>
                                  <span className="font-semibold">{formatCurrency(amount)}</span>
                                </div>
                              )
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground">No data</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Gift Aid</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">With Gift Aid</span>
                            <span className="font-semibold">
                              {fundraiserDetails.statistics.giftAidCount}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Percentage</span>
                            <span className="font-semibold">
                              {fundraiserDetails.statistics.giftAidPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          ) : (
            <div className="px-6 py-6">
              <p className="text-sm text-muted-foreground">Failed to load fundraiser details</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
