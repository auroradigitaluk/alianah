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
import { generateCompletionReportPDF } from "@/lib/pdf-generator"
import { formatDonorName, formatPaymentMethod, displayDonorEmail } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface SponsorshipDonation {
  id: string
  amountPence: number
  donationType: string
  paymentMethod: string
  transactionId?: string | null
  giftAid: boolean
  emailSent: boolean
  reportSent: boolean
  notes: string | null
  status: string | null
  createdAt: Date | string
  completedAt: Date | string | null
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
  }
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
  ORPHANS: "Orphans",
  HIFZ: "Hifz",
  FAMILIES: "Families",
}

function getOrderNumberFromNotes(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/OrderNumber:([A-Z0-9-]+)/)
  return match?.[1] || null
}

export function SponsorshipDonationsTable({ 
  donations, 
  projectType,
  projectId,
  initialOpenId,
}: { 
  donations: SponsorshipDonation[]
  projectType: string
  projectId: string
  initialOpenId?: string | null
}) {
  const [selectedDonation, setSelectedDonation] = useState<SponsorshipDonation | null>(null)
  const [poolTotal, setPoolTotal] = useState(0)
  const [poolAvailable, setPoolAvailable] = useState(0)
  const [uploadingPool, setUploadingPool] = useState(false)

  useEffect(() => {
    if (initialOpenId && donations.length > 0) {
      const found = donations.find((d) => d.id === initialOpenId)
      if (found) setSelectedDonation(found)
    }
  }, [initialOpenId, donations])

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/admin/sponsorships/${projectId}/report-pool`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPoolTotal(data.total ?? 0)
          setPoolAvailable(data.available ?? 0)
        }
      })
      .catch(() => {})
  }, [projectId])
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [completionImages, setCompletionImages] = useState<string[]>([])
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
      const response = await fetch(`/api/admin/sponsorships/donations/${donationId}`, {
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
        ? `${existingNotes}\n\n${new Date().toLocaleDateString('en-GB')} - ${newNote}`
        : `${new Date().toLocaleDateString('en-GB')} - ${newNote}`

      const response = await fetch(`/api/admin/sponsorships/donations/${selectedDonation.id}`, {
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

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedDonation) return

    setUploadingImages(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append("files", file)
      })

      const response = await fetch("/api/admin/sponsorships/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload images")
      }

      const { urls } = await response.json()
      setCompletionImages([...completionImages, ...urls])
      toast.success("Images uploaded successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload images")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleGenerateReport = async () => {
    if (completionImages.length !== 4) {
      toast.error("Please upload exactly 4 images before generating a report")
      return
    }

    if (!selectedDonation) {
      toast.error("No donation selected")
      return
    }

    setGeneratingReport(true)
    try {
      // Generate PDF report (returns blob URL)
      const pdfBlobUrl = await generateCompletionReportPDF({
        projectType: PROJECT_TYPE_LABELS[projectType] || projectType,
        country: selectedDonation.country.country,
        donorName: `${selectedDonation.donor.firstName} ${selectedDonation.donor.lastName}`,
        amount: selectedDonation.amountPence,
        completionDate: new Date().toLocaleDateString('en-GB'),
        googleDriveLink: googleDriveLink || undefined,
        images: completionImages,
        reportKind: "Sponsorship",
      })

      // Convert blob URL to File and upload to Vercel Blob
      const response = await fetch(pdfBlobUrl)
      const blob = await response.blob()
      const pdfFile = new File([blob], `completion-report-${selectedDonation.id}.pdf`, { type: "application/pdf" })
      
      const formData = new FormData()
      formData.append("file", pdfFile)

      const uploadResponse = await fetch("/api/admin/sponsorships/upload-pdf", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload PDF")
      }

      const { url: pdfUrl } = await uploadResponse.json()

      // Also create text version for email
      const driveLinkSection = googleDriveLink 
        ? `\n\nView all project content and additional photos: ${googleDriveLink}`
        : ""
      
      const report = `Sponsorship Completion Report

Project Type: ${PROJECT_TYPE_LABELS[projectType] || projectType}
Country: ${selectedDonation.country.country}
Donor: ${formatDonorName(selectedDonation.donor)}
Amount: £${((selectedDonation.amountPence || 0) / 100).toFixed(2)}

Status: Complete

This sponsorship has been successfully completed. The images below show the completed work.${driveLinkSection}

Completion Date: ${new Date().toLocaleDateString('en-GB')}

Thank you for your generous support in making this project possible.`

      setCompletionReport(report)
      setCompletionReportPDF(pdfUrl)
      
      // Clean up blob URL
      URL.revokeObjectURL(pdfBlobUrl)
      
      toast.success("PDF report generated and uploaded successfully")
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate report")
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleReviewReport = () => {
    if (!selectedDonation || completionImages.length !== 4) {
      toast.error("Please upload exactly 4 images before reviewing")
      return
    }
    if (!completionReportPDF) {
      toast.error("Please generate a PDF report before reviewing")
      return
    }
    setReviewingReport(true)
  }

  const handleApproveAndSend = async () => {
    if (!selectedDonation) return

    setSendingReport(true)
    try {
      const response = await fetch(`/api/admin/sponsorships/donations/${selectedDonation.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "COMPLETE",
        completionImages,
        completionReport,
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

  const handleUploadPoolFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !projectId) return
    if (files.length > 50) {
      toast.error("Maximum 50 files per upload")
      e.target.value = ""
      return
    }
    setUploadingPool(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append("file", file))
      const res = await fetch(`/api/admin/sponsorships/${projectId}/report-pool`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to upload")
      }
      const data = await res.json()
      setPoolTotal(data.total ?? poolTotal + data.uploaded)
      setPoolAvailable(data.available ?? poolAvailable + data.uploaded)
      toast.success(`${data.uploaded} report(s) added to pool. ${data.available} available.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload reports")
    } finally {
      setUploadingPool(false)
      e.target.value = ""
    }
  }

  const handleMarkCompleteWithPool = async () => {
    if (!selectedDonation) return
    setSendingReport(true)
    try {
      const res = await fetch(`/api/admin/sponsorships/donations/${selectedDonation.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETE",
          usePoolReport: true,
          googleDriveLink: googleDriveLink || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to complete")
      }
      toast.success("Donation marked complete and report sent to donor")
      setSelectedDonation(null)
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete donation")
    } finally {
      setSendingReport(false)
    }
  }

  const handleExportDonations = () => {
    try {
      // Create CSV content
      const headers = [
        "Donor First Name",
        "Donor Last Name",
        "Email",
        "Country",
        "Amount",
        "Status",
        "Type",
        "Date",
        "Gift Aid",
      ]
      const rows = donations.map(d => [
        d.donor.firstName,
        d.donor.lastName,
        displayDonorEmail(d.donor.email),
        d.country.country,
        `£${(d.amountPence / 100).toFixed(2)}`,
        d.status || "No Status",
        DONATION_TYPE_LABELS[d.donationType] || d.donationType,
        new Date(d.createdAt).toLocaleDateString('en-GB'),
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
      link.download = `sponsorships-${projectType.toLowerCase()}-donations-${new Date().toISOString().split('T')[0]}.csv`
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
      const country = donation.country.country.toLowerCase()
      
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
        return a.country.country.localeCompare(b.country.country)
      case "country-desc":
        return b.country.country.localeCompare(a.country.country)
      default:
        return 0
    }
  })

  const stats = {
    total: donations.length,
    complete: donations.filter(d => d.status === "COMPLETE").length,
    ongoing: donations.filter(d => {
      const status = d.status
      return status && ["WAITING_TO_REVIEW", "ORDERED", "PENDING"].includes(status)
    }).length,
  }

  return (
    <>
      {/* Quick Stats */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Total Donations</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Ongoing</p>
          <p className="text-lg font-bold text-orange-600">{stats.ongoing}</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">Complete</p>
          <p className="text-lg font-bold text-primary">{stats.complete}</p>
        </div>
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
          setCompletionImages([])
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
                {getOrderNumberFromNotes(donation.notes) || <span className="text-muted-foreground">-</span>}
              </div>
            ),
          },
          {
            id: "country",
            header: "Country",
            cell: (donation) => (
              <div className="font-medium">{donation.country.country}</div>
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
            cell: (donation) => getStatusBadge(donation.status),
          },
          {
            id: "createdAt",
            header: "Date",
            cell: (donation) => (
              <div className="text-sm">
                {new Date(donation.createdAt).toLocaleDateString('en-GB')}
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
                    <TabsTrigger value="report-pool">Completion report pool</TabsTrigger>
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
                  <p className="text-base font-medium">{new Date(selectedDonation.createdAt).toLocaleDateString('en-GB')}</p>
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
                    <p className="text-base font-medium mt-1">{PROJECT_TYPE_LABELS[projectType] || projectType}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</p>
                    <p className="text-base font-medium mt-1">{selectedDonation.country.country}</p>
                  </div>
                </div>
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
                {getOrderNumberFromNotes(selectedDonation.notes) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Number</p>
                    <p className="text-sm font-mono mt-1">{getOrderNumberFromNotes(selectedDonation.notes)}</p>
                  </div>
                )}
              </div>
            </div>

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
                  </TabsContent>

                  <TabsContent value="report-pool" className="space-y-6 mt-0">
                    {/* Report pool – upload your own PDFs (up to 50 at a time) */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completion report pool</h3>
                      <p className="text-xs text-muted-foreground">
                        Upload your own report PDFs. When you mark a donation as complete, one report from the pool is automatically sent to the donor.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="file"
                          accept="application/pdf"
                          multiple
                          onChange={handleUploadPoolFiles}
                          disabled={uploadingPool}
                          className="hidden"
                          id="report-pool-input"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("report-pool-input")?.click()}
                          disabled={uploadingPool}
                        >
                          {uploadingPool ? "Uploading..." : "Upload PDFs (up to 50)"}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {poolTotal} in pool, {poolAvailable} available
                        </span>
                      </div>
                    </div>

                    {/* Completion – mark complete and send report from pool */}
                    {selectedDonation.status !== "COMPLETE" && (
                      <div className="space-y-3 border-t pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completion</h3>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Google Drive Link (Optional)</Label>
                            <Input
                              type="url"
                              placeholder="https://drive.google.com/..."
                              value={googleDriveLink}
                              onChange={(e) => setGoogleDriveLink(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Add a Google Drive link for the donor to view all project content and additional photos
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={handleMarkCompleteWithPool}
                            disabled={sendingReport || poolAvailable === 0}
                            className="w-full"
                          >
                            {sendingReport ? (
                              "Sending..."
                            ) : (
                              <>
                                <IconSend className="h-4 w-4 mr-2" />
                                Mark complete & send report to donor
                              </>
                            )}
                          </Button>
                          {poolAvailable === 0 && (
                            <p className="text-xs text-amber-600">Upload report PDFs to the pool above first.</p>
                          )}
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
                                {new Date(selectedDonation.completedAt).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                          )}
                          {selectedDonation.reportSent && (
                            <div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const pdfUrl = await generateCompletionReportPDF({
                                      projectType: PROJECT_TYPE_LABELS[projectType] || projectType,
                                      country: selectedDonation.country.country,
                                      donorName: formatDonorName(selectedDonation.donor),
                                      amount: selectedDonation.amountPence,
                                      completionDate: selectedDonation.completedAt 
                                        ? new Date(selectedDonation.completedAt).toLocaleDateString('en-GB')
                                        : new Date().toLocaleDateString('en-GB'),
                                      googleDriveLink: undefined,
                                      images: [],
                                      reportKind: "Sponsorship",
                                    })
                                    const link = document.createElement("a")
                                    link.href = pdfUrl
                                    const safeFileName = formatDonorName(selectedDonation.donor).replace(/[^a-z0-9]/gi, '-').toLowerCase()
                                    link.download = `completion-report-${selectedDonation.id}-${safeFileName}.pdf`
                                    link.click()
                                    setTimeout(() => URL.revokeObjectURL(pdfUrl), 100)
                                  } catch (error) {
                                    toast.error("Failed to generate PDF report")
                                    console.error("Error generating PDF:", error)
                                  }
                                }}
                              >
                                <IconFileText className="h-4 w-4 mr-1" />
                                Download Report PDF
                              </Button>
                            </div>
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
