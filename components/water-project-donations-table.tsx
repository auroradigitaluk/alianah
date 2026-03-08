"use client"

import { useState, useEffect } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"
import { IconPencil, IconUpload, IconFileText, IconMail, IconCheck, IconEye, IconX, IconSend, IconDownload } from "@tabler/icons-react"
import { ExternalLink } from "lucide-react"
import { formatDate, formatDonorName, formatPaymentMethod, displayDonorEmail, formatCurrency } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IconDroplet, IconClock } from "@tabler/icons-react"
import { Wallet } from "lucide-react"

interface WaterProjectDonation {
  id: string
  amountPence: number
  donationType: string
  paymentMethod: string
  transactionId?: string | null
  giftAid: boolean
  emailSent: boolean
  reportSent: boolean
  donationNumber?: string | null
  notes: string | null
  status: string | null
  createdAt: Date | string
  completedAt: Date | string | null
  plaqueName?: string | null
  donor: {
    title?: string | null
    firstName: string
    lastName: string
    email: string
    phone: string | null
  }
  country: {
    country: string
    pricePence: number
  } | null
  countryName?: string | null
  projectTypeSnapshot?: string | null
  waterProject?: { projectType: string } | null
  fundraiser?: {
    id: string
    slug: string
    title: string
    targetAmountPence: number | null
    plaqueName: string | null
  } | null
  fundraiserTotalRaisedPence?: number | null
  fundraiserTargetMet?: boolean
}

const STATUS_OPTIONS = [
  { value: "WAITING_TO_REVIEW", label: "To Review", color: "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/90" },
  { value: "ORDERED", label: "Ordered", color: "border-transparent bg-blue-500 text-white hover:bg-blue-500/90" },
  { value: "PENDING", label: "Pending", color: "border-transparent bg-orange-500 text-white hover:bg-orange-500/90" },
  { value: "COMPLETE", label: "Complete", color: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90" },
]

const DONATION_TYPE_LABELS: Record<string, string> = {
  GENERAL: "General",
  SADAQAH: "Sadaqah",
  ZAKAT: "Zakat",
  LILLAH: "Lillah",
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  WATER_PUMP: "Water Pump",
  WATER_WELL: "Water Well",
  WATER_TANK: "Water Tank",
  WUDHU_AREA: "Wudhu Area",
}

function getOrderNumberFromNotes(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/OrderNumber:([A-Z0-9-]+)/)
  return match?.[1] || null
}

function getPlaqueNameFromNotes(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/Plaque Name:\s*(.+?)(?:\s*\|\s*|$)/)
  return match?.[1]?.trim() || null
}

export function WaterProjectDonationsTable({ 
  donations, 
  projectType,
  initialOpenId,
}: { 
  donations: WaterProjectDonation[]
  projectType: string
  initialOpenId?: string | null
}) {
  const [selectedDonation, setSelectedDonation] = useState<WaterProjectDonation | null>(null)

  useEffect(() => {
    if (initialOpenId && donations.length > 0) {
      const found = donations.find((d) => d.id === initialOpenId)
      if (found) setSelectedDonation(found)
    }
  }, [initialOpenId, donations])
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [completionReport, setCompletionReport] = useState("")
  const [completionReportPDF, setCompletionReportPDF] = useState<string | null>(null)
  const [googleDriveLink, setGoogleDriveLink] = useState("")
  const [reviewingReport, setReviewingReport] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<string>("date-desc")

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline" className="px-1.5 text-muted-foreground">No Status</Badge>
    }
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status)
    return (
      <Badge variant="default" className={`px-1.5 ${statusOption?.color || ""}`}>
        {statusOption?.label || status}
      </Badge>
    )
  }

  const handleUpdateStatus = async (donationId: string, newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const response = await fetch(`/api/admin/water-projects/donations/${donationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update status")
      }

      toast.success("Status updated successfully")
      setSelectedDonation(null)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedDonation || !notes.trim()) return

    setSavingNotes(true)
    try {
      // Append new note to existing notes
      const existingNotes = selectedDonation.notes || ""
      const newNote = notes.trim()
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n\n${formatDate(new Date())} - ${newNote}`
        : `${formatDate(new Date())} - ${newNote}`

      const response = await fetch(`/api/admin/water-projects/donations/${selectedDonation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: updatedNotes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save notes")
      }

      toast.success("Note added successfully")
      setNotes("") // Clear the textarea
      setEditingNotes(false)
      setSelectedDonation({ ...selectedDonation, notes: updatedNotes })
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add note")
    } finally {
      setSavingNotes(false)
    }
  }

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedDonation) return
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file")
      return
    }
    setUploadingPdf(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/admin/water-projects/upload-pdf", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to upload PDF")
      }
      const { url } = await response.json()
      setCompletionReportPDF(url)
      toast.success("Report PDF uploaded")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload PDF")
    } finally {
      setUploadingPdf(false)
      e.target.value = ""
    }
  }

  const handleReviewReport = () => {
    if (!selectedDonation) return
    if (!completionReportPDF) {
      toast.error("Please upload your completion report (PDF) before sending")
      return
    }
    setReviewingReport(true)
  }

  const handleApproveAndSend = async () => {
    if (!selectedDonation) return

    setSendingReport(true)
    try {
      const response = await fetch(`/api/admin/water-projects/donations/${selectedDonation.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETE",
        completionImages: [],
        completionReport: completionReport || "",
        completionReportPDF: completionReportPDF,
        googleDriveLink: googleDriveLink || null,
      }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete donation")
      }

      toast.success("Donation marked as complete and email sent to donor")
      setReviewingReport(false)
      setCompletionReportPDF(null)
      setCompletionReport("")
      setGoogleDriveLink("")
      setSelectedDonation(null)
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete donation")
    } finally {
      setSendingReport(false)
    }
  }

  const handleCancelReview = () => {
    setReviewingReport(false)
  }

  // Reset completion state when switching or closing donation
  useEffect(() => {
    if (!selectedDonation) {
      setCompletionReportPDF(null)
      setCompletionReport("")
      setGoogleDriveLink("")
    }
  }, [selectedDonation])

  const handleExportDonations = () => {
    try {
      // Create CSV content
      const headers = [
        "Order No.",
        "Donor First Name",
        "Donor Last Name",
        "Email",
        "Country",
        "Plaque Name",
        "Amount",
        "Status",
        "Type",
        "Date",
        "Gift Aid",
      ]
      const rows = donations.map(d => [
        d.donationNumber ?? getOrderNumberFromNotes(d.notes) ?? "",
        d.donor.firstName,
        d.donor.lastName,
        displayDonorEmail(d.donor.email),
        d.country?.country ?? "",
        d.plaqueName ?? d.fundraiser?.plaqueName ?? getPlaqueNameFromNotes(d.notes) ?? "",
        `£${(d.amountPence / 100).toFixed(2)}`,
        d.status || "No Status",
        DONATION_TYPE_LABELS[d.donationType] || d.donationType,
        formatDate(d.createdAt),
        d.giftAid ? "Yes" : "No",
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n")

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `water-projects-${projectType.toLowerCase()}-donations-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)

      toast.success("Donations exported successfully")
    } catch (error) {
      toast.error("Failed to export donations")
      console.error("Export error:", error)
    }
  }

  // Filter donations
  const filteredDonations = donations.filter(donation => {
    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "no-status" && donation.status) return false
      if (statusFilter !== "no-status" && donation.status !== statusFilter) return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const donorName = formatDonorName(donation.donor).toLowerCase()
      const email = donation.donor.email.toLowerCase()
      const country = (donation.country?.country ?? "").toLowerCase()
      
      if (!donorName.includes(query) && !email.includes(query) && !country.includes(query)) {
        return false
      }
    }

    return true
  })

  // Sort donations
  const sortedDonations = [...filteredDonations].sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case "date-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case "amount-desc":
        return b.amountPence - a.amountPence
      case "amount-asc":
        return a.amountPence - b.amountPence
      case "donor-asc":
        const nameA = formatDonorName(a.donor).toLowerCase()
        const nameB = formatDonorName(b.donor).toLowerCase()
        return nameA.localeCompare(nameB)
      case "donor-desc":
        const nameA2 = formatDonorName(a.donor).toLowerCase()
        const nameB2 = formatDonorName(b.donor).toLowerCase()
        return nameB2.localeCompare(nameA2)
      case "country-asc":
        return (a.country?.country ?? "").localeCompare(b.country?.country ?? "")
      case "country-desc":
        return (b.country?.country ?? "").localeCompare(a.country?.country ?? "")
      default:
        return 0
    }
  })

  const stats = {
    total: donations.length,
    totalAmountPence: donations.reduce((sum, d) => sum + (d.amountPence ?? 0), 0),
    complete: donations.filter(d => d.status === "COMPLETE").length,
    ongoing: donations.filter(d => {
      const status = d.status
      return status && ["WAITING_TO_REVIEW", "ORDERED", "PENDING"].includes(status)
    }).length,
  }

  return (
    <>
      {/* Stats cards – same design as dashboard */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-card border-primary/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Total donations</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <IconDroplet className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Quantity</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-card border-blue-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Total amount</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmountPence)}</div>
            <p className="text-xs text-muted-foreground mt-1">£ amount</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-card border-orange-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <IconClock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{stats.ongoing}</div>
            <p className="text-xs text-muted-foreground mt-1">Quantity</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/10 via-green-500/5 to-card border-green-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Complete</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <IconCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{stats.complete}</div>
            <p className="text-xs text-muted-foreground mt-1">Quantity</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <Input
            type="text"
            transform="titleCase"
            placeholder="Search by donor name, email, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="WAITING_TO_REVIEW">To Review</SelectItem>
              <SelectItem value="ORDERED">Ordered</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETE">Complete</SelectItem>
              <SelectItem value="no-status">No Status</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="amount-desc">Amount (High to Low)</SelectItem>
              <SelectItem value="amount-asc">Amount (Low to High)</SelectItem>
              <SelectItem value="donor-asc">Donor (A-Z)</SelectItem>
              <SelectItem value="donor-desc">Donor (Z-A)</SelectItem>
              <SelectItem value="country-asc">Country (A-Z)</SelectItem>
              <SelectItem value="country-desc">Country (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportDonations}
        >
          <IconDownload className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      <AdminTable
        data={sortedDonations}
        onRowClick={(donation) => {
          setSelectedDonation(donation)
          setNotes("")
          setEditingNotes(false)
          setCompletionReport("")
          setCompletionReportPDF(null)
          setGoogleDriveLink("")
          setReviewingReport(false)
        }}
        columns={[
          {
            id: "donor",
            header: "Donor",
            cell: (donation) => (
              <div className="font-medium">
                {formatDonorName(donation.donor)}
              </div>
            ),
          },
          {
            id: "orderNumber",
            header: "Order No.",
            cell: (donation) => (
              <div className="text-xs font-mono">
                {(donation.donationNumber ?? getOrderNumberFromNotes(donation.notes)) || <span className="text-muted-foreground">-</span>}
              </div>
            ),
          },
          {
            id: "country",
            header: "Country",
            cell: (donation) => (
              <div className="font-medium">{donation.country?.country ?? donation.countryName ?? "Deleted country"}</div>
            ),
          },
          {
            id: "amount",
            header: "Amount",
            cell: (donation) => (
              <div className="font-medium">£{(donation.amountPence / 100).toFixed(2)}</div>
            ),
          },
          {
            id: "status",
            header: "Status",
            cell: (donation) => (
              <div className="flex flex-col gap-1">
                {getStatusBadge(donation.status)}
                {donation.fundraiserTargetMet && (
                  <Badge variant="outline" className="text-[10px] px-1 border-green-500 text-green-700 dark:text-green-400 w-fit">
                    Target met
                  </Badge>
                )}
              </div>
            ),
          },
          {
            id: "createdAt",
            header: "Date",
            cell: (donation) => (
              <div className="text-sm">
                {formatDate(donation.createdAt)}
              </div>
            ),
          },
          {
            id: "view",
            header: "View",
            cell: () => (
              <div className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="h-4 w-4" />
              </div>
            ),
          },
        ]}
        enableSelection={false}
      />
      <Dialog
        open={!!selectedDonation}
        onOpenChange={(open) => !open && setSelectedDonation(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedDonation ? `Donation Overview - ${formatDonorName(selectedDonation.donor)}` : "Donation Overview"}
            </DialogTitle>
            <DialogDescription>
              Comprehensive donation details and management
            </DialogDescription>
          </DialogHeader>

          {selectedDonation && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Donor Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Donor Information</h3>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div>
                  <p className="text-lg font-semibold">
                    {formatDonorName(selectedDonation.donor)}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{displayDonorEmail(selectedDonation.donor.email)}</span>
                  </div>
                  {selectedDonation.donor.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{selectedDonation.donor.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Donation Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Donation Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</p>
                  <p className="text-2xl font-bold">£{(selectedDonation.amountPence / 100).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedDonation.status)}
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Donation Type</p>
                  <div className="mt-1">
                    <Badge variant="outline" className="px-1.5">
                      {DONATION_TYPE_LABELS[selectedDonation.donationType] || selectedDonation.donationType}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</p>
                  <p className="text-base font-medium">{formatDate(selectedDonation.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Project Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Project Information</h3>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Project Type</p>
                    <p className="text-base font-medium mt-1">{(PROJECT_TYPE_LABELS[selectedDonation.projectTypeSnapshot ?? projectType]) ?? (selectedDonation.projectTypeSnapshot ?? projectType)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</p>
                    <p className="text-base font-medium mt-1">{selectedDonation.country?.country ?? selectedDonation.countryName ?? "Deleted country"}</p>
                  </div>
                </div>
                {(selectedDonation.plaqueName || selectedDonation.fundraiser?.plaqueName || getPlaqueNameFromNotes(selectedDonation.notes)) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name on plaque</p>
                    <p className="text-base font-medium mt-1">
                      {selectedDonation.plaqueName || selectedDonation.fundraiser?.plaqueName || getPlaqueNameFromNotes(selectedDonation.notes) || "—"}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Method</p>
                    <p className="text-sm mt-1">{formatPaymentMethod(selectedDonation.paymentMethod)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gift Aid</p>
                    <p className="text-sm mt-1">{selectedDonation.giftAid ? "Yes" : "No"}</p>
                  </div>
                </div>
                {selectedDonation.transactionId && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transaction ID</p>
                    <p className="text-sm font-mono mt-1">{selectedDonation.transactionId}</p>
                  </div>
                )}
                {(selectedDonation.donationNumber ?? getOrderNumberFromNotes(selectedDonation.notes)) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Number</p>
                    <p className="text-sm font-mono mt-1">{selectedDonation.donationNumber ?? getOrderNumberFromNotes(selectedDonation.notes)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fundraiser (when donation is part of a fundraiser) */}
            {selectedDonation.fundraiser && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fundraiser</h3>
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign</p>
                    <a
                      href={`/fundraise/${selectedDonation.fundraiser.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-medium mt-1 text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {selectedDonation.fundraiser.title}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target</p>
                      <p className="text-base font-medium mt-1">
                        £{((selectedDonation.fundraiser.targetAmountPence ?? 0) / 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Raised</p>
                      <p className="text-base font-medium mt-1">
                        £{((selectedDonation.fundraiserTotalRaisedPence ?? 0) / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {selectedDonation.fundraiserTargetMet && (
                    <div className="pt-2 border-t">
                      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                        Target met — ready to process
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Management */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status Management</h3>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Current Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedDonation.status)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Update Status:</Label>
                  <Select
                    value={selectedDonation.status || ""}
                    onValueChange={(value) => handleUpdateStatus(selectedDonation.id, value)}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Internal Notes</h3>
                {!editingNotes && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingNotes(true)
                      setNotes("")
                    }}
                  >
                    <IconPencil className="h-4 w-4 mr-1" />
                    Add Notes
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  {selectedDonation.notes && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedDonation.notes}</p>
                    </div>
                  )}
                  <Textarea
                    transform="titleCase"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a new note..."
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={savingNotes || !notes.trim()}
                    >
                      {savingNotes ? "Adding..." : "Add Note"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingNotes(false)
                        setNotes("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-lg">
                  {selectedDonation.notes ? (
                    <p className="text-sm whitespace-pre-wrap">{selectedDonation.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No notes added yet</p>
                  )}
                </div>
              )}
            </div>

            {/* Completion Management */}
            {selectedDonation.status !== "COMPLETE" && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completion Management</h3>
                <p className="text-xs text-muted-foreground">
                  Upload your own completion report (PDF) and optionally add a Google Drive link. The report and link will be sent to the donor.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Your Completion Report (PDF) *</Label>
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleUploadPdf}
                        disabled={uploadingPdf}
                        className="hidden"
                        id="completion-pdf-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("completion-pdf-input")?.click()}
                        disabled={uploadingPdf}
                      >
                        <IconFileText className="h-4 w-4 mr-1" />
                        {uploadingPdf ? "Uploading..." : "Upload PDF"}
                      </Button>
                      {completionReportPDF && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(completionReportPDF, "_blank")}
                          >
                            <IconEye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCompletionReportPDF(null)}
                            className="text-muted-foreground"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create the report yourself and upload it here. It will be sent to the donor in the completion email.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Google Drive Link (Optional)</Label>
                    <Input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={googleDriveLink}
                      onChange={(e) => setGoogleDriveLink(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add a Google Drive link so the donor can view all project files and additional photos.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email message (Optional)</Label>
                    <Textarea
                      value={completionReport}
                      onChange={(e) => setCompletionReport(e.target.value)}
                      placeholder="Short message to include in the email body..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>

                  {completionReportPDF && (
                    <Button
                      type="button"
                      onClick={handleReviewReport}
                      className="w-full"
                    >
                      <IconEye className="h-4 w-4 mr-2" />
                      Review & Send to Donor
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Report Review Modal */}
            {reviewingReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-background border rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                      <h3 className="text-lg font-semibold">Review Completion Report</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelReview}
                        disabled={sendingReport}
                      >
                        <IconX className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Completion Report (PDF)</Label>
                        <div className="p-4 bg-muted rounded-lg border space-y-2">
                          {completionReportPDF ? (
                            <>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(completionReportPDF, "_blank")}
                                >
                                  <IconEye className="h-4 w-4 mr-1" />
                                  Preview PDF
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const link = document.createElement("a")
                                    link.href = completionReportPDF
                                    link.download = `completion-report-${selectedDonation.id}.pdf`
                                    link.click()
                                  }}
                                >
                                  <IconFileText className="h-4 w-4 mr-1" />
                                  Download PDF
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This report will be sent to the donor.
                              </p>
                            </>
                          ) : null}
                        </div>
                      </div>
                      {googleDriveLink ? (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Google Drive Link</Label>
                          <div className="p-3 bg-muted rounded-lg border">
                            <a
                              href={googleDriveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline break-all"
                            >
                              {googleDriveLink}
                            </a>
                          </div>
                        </div>
                      ) : null}

                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          <strong>Note:</strong> This report will be sent to {formatDonorName(selectedDonation.donor)} ({displayDonorEmail(selectedDonation.donor.email)}) once you approve.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelReview}
                        disabled={sendingReport}
                        className="flex-1"
                      >
                        <IconX className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleApproveAndSend}
                        disabled={sendingReport}
                        className="flex-1"
                      >
                        {sendingReport ? (
                          <>
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <IconSend className="h-4 w-4 mr-2" />
                            Approve & Send to Donor
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Status */}
            {selectedDonation.status === "COMPLETE" && (
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completion Status</h3>
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary dark:text-primary">
                      <IconCheck className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                    {selectedDonation.reportSent && (
                      <Badge variant="outline">
                        <IconMail className="h-3 w-3 mr-1" />
                        Report Sent
                      </Badge>
                    )}
                  </div>
                  {selectedDonation.completedAt && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completion Date</p>
                      <p className="text-sm font-medium mt-1">
                        {formatDate(selectedDonation.completedAt)}
                      </p>
                    </div>
                  )}
                  {selectedDonation.reportSent && (
                    <p className="text-xs text-muted-foreground">
                      Completion report was sent to the donor by email.
                    </p>
                  )}
                </div>
              </div>
            )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
