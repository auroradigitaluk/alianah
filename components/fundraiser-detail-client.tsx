"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatCurrency,
  formatEnum,
  formatDate,
  formatDonorName,
  formatPaymentMethod,
  displayDonorEmail,
} from "@/lib/utils"
import { StatusBadge } from "@/components/admin-table"
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Calendar,
  Target,
  Mail,
  User,
  Hash,
  MessageSquare,
  Megaphone,
  FileText,
  Download,
  Pencil,
} from "lucide-react"
import { IconCheck, IconX, IconCircleCheckFilled, IconLoader } from "@tabler/icons-react"
import { toast } from "sonner"

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
  consolidatedWaterProjectDonationId?: string | null
  waterProject?: { id: string; projectType: string } | null
  waterProjectCountryId?: string | null
  waterProjectCountry?: { id: string; country: string } | null
  campaign: {
    id: string
    title: string
    slug: string
    summary: string | null
    isActive: boolean
    type: "APPEAL" | "WATER" | "QURBANI"
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
  donations: Array<{
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
    appeal?: { title: string } | null
    product?: { name: string } | null
  }>
}

export function FundraiserDetailClient({ fundraiserId }: { fundraiserId: string }) {
  const router = useRouter()
  const [details, setDetails] = useState<FundraiserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [editTargetAmountPence, setEditTargetAmountPence] = useState("")
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [consolidating, setConsolidating] = useState(false)
  const [editWaterProjectCountryId, setEditWaterProjectCountryId] = useState("")
  const [waterCountries, setWaterCountries] = useState<{ id: string; country: string }[]>([])

  const fetchDetails = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/fundraisers/${fundraiserId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Failed to load (${res.status})`)
      }
      const data = await res.json()
      setDetails(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }, [fundraiserId])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  const handleToggleStatus = async () => {
    if (!details) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/fundraisers/${details.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !details.isActive }),
      })
      if (!res.ok) throw new Error("Failed to update")
      await fetchDetails()
      router.refresh()
    } catch {
      alert("Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!details || !window.confirm("Remove this fundraiser? The page link will stop working. Donations will be kept."))
      return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/fundraisers/${details.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to delete")
      }
      router.push("/admin/fundraisers")
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setDeleting(false)
    }
  }

  const startEditing = () => {
    if (details) {
      setEditName(details.fundraiserName)
      setEditEmail(details.email)
      setEditMessage(details.message ?? "")
      setEditTargetAmountPence(
        details.targetAmountPence != null ? (details.targetAmountPence / 100).toFixed(2) : ""
      )
      setEditWaterProjectCountryId(details.waterProjectCountryId ?? "")
      setEditError(null)
      setIsEditing(true)
      if (details.campaign.type === "WATER" && details.waterProject?.projectType) {
        fetch(`/api/admin/water-projects/countries?projectType=${details.waterProject.projectType}`)
          .then((res) => res.json())
          .then((list: unknown) => {
            if (Array.isArray(list)) {
              setWaterCountries(
                list
                  .filter(
                    (c): c is { id: string; country: string } =>
                      c && typeof c === "object" && "id" in c && "country" in c
                  )
                  .map((c) => ({ id: c.id, country: c.country }))
              )
            }
          })
          .catch(() => setWaterCountries([]))
      } else {
        setWaterCountries([])
      }
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditError(null)
  }

  const saveDetails = async () => {
    if (!details) return
    const name = editName.trim()
    const email = editEmail.trim()
    if (!name || !email) {
      setEditError("Name and email are required.")
      return
    }
    const targetTrim = editTargetAmountPence.trim()
    let targetAmountPence: number | null = null
    if (targetTrim !== "") {
      const pounds = parseFloat(targetTrim)
      if (Number.isNaN(pounds) || pounds < 0) {
        setEditError("Goal must be a valid non-negative number.")
        return
      }
      targetAmountPence = Math.round(pounds * 100)
    }
    setSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/fundraisers/${details.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundraiserName: name,
          email,
          message: editMessage.trim() || null,
          targetAmountPence,
          ...(details.campaign.type === "WATER"
            ? { waterProjectCountryId: editWaterProjectCountryId || null }
            : {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to update")
      }
      setIsEditing(false)
      await fetchDetails()
      router.refresh()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const exportDonationsToCSV = () => {
    if (!details || details.donations.length === 0) return
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
    const rows = details.donations.map((d) => [
      d.donor.firstName,
      d.donor.lastName,
      displayDonorEmail(d.donor.email),
      formatCurrency(d.amountPence),
      formatEnum(d.status),
      formatDate(d.completedAt ? new Date(d.completedAt) : new Date(d.createdAt)),
      formatPaymentMethod(d.paymentMethod),
      formatEnum(d.donationType),
      d.giftAid ? "Yes" : "No",
      d.billingAddress ?? "",
      d.billingCity ?? "",
      d.billingPostcode ?? "",
      d.billingCountry ?? "",
      d.transactionId ?? "",
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `donations-${details.fundraiserName}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !details) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/fundraisers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to fundraisers
        </Link>
        <p className="text-destructive">{error ?? "Fundraiser not found."}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/fundraisers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to fundraisers
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/fundraise/${details.slug}`, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View page
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleStatus} disabled={updating}>
            {details.isActive ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {details.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{details.title}</h1>
        <p className="text-muted-foreground text-sm">Fundraiser details and donations</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="donations">Donations ({details.statistics.donationCount})</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Raised</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(details.statistics.totalRaised)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{details.statistics.donationCount}</div>
              </CardContent>
            </Card>
            {details.targetAmountPence && (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    {details.statistics.progressPercentage.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of {formatCurrency(details.targetAmountPence)}
                  </div>
                  {details.campaign.type === "WATER" &&
                    details.statistics.totalRaised >= (details.targetAmountPence ?? 0) &&
                    !details.consolidatedWaterProjectDonationId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        disabled={consolidating}
                        onClick={async () => {
                          setConsolidating(true)
                          try {
                            const res = await fetch(`/api/admin/fundraisers/${fundraiserId}/consolidate-water`, {
                              method: "POST",
                            })
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok) {
                              toast.error(data.error ?? "Failed to add to water projects")
                              return
                            }
                            if (data.success) {
                              toast.success("Added to water projects. You can process it under Water Projects.")
                              await fetchDetails()
                              router.refresh()
                            } else {
                              toast.info(data.message ?? "Already added or not eligible.")
                            }
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Something went wrong")
                          } finally {
                            setConsolidating(false)
                          }
                        }}
                      >
                        {consolidating ? (
                          <>
                            <IconLoader className="h-4 w-4 mr-2 animate-spin" />
                            Moving…
                          </>
                        ) : (
                          "Move to Active Projects"
                        )}
                      </Button>
                    )}
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold">Fundraiser information</h3>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4 rounded-lg border p-4">
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fundraiser name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Goal (£)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Leave empty for no goal"
                  value={editTargetAmountPence}
                  onChange={(e) => setEditTargetAmountPence(e.target.value)}
                />
              </div>
              {details.campaign.type === "WATER" && waterCountries.length > 0 && (
                <div className="space-y-2">
                  <Label>Water project country</Label>
                  <Select
                    value={editWaterProjectCountryId || "_none"}
                    onValueChange={(v) => setEditWaterProjectCountryId(v === "_none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No country selected</SelectItem>
                      {waterCountries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Required for &quot;Move to Active Projects&quot; to work.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveDetails} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fundraiser name</p>
                    <p className="font-medium">{details.fundraiserName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="break-all">{details.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Slug</p>
                    <p className="font-mono text-sm">{details.slug}</p>
                  </div>
                </div>
                {details.campaign.type === "WATER" && (
                  <div className="flex items-center gap-3">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Water project country</p>
                      <p className="font-medium">
                        {details.waterProjectCountry?.country ?? "Not set"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <StatusBadge isActive={details.isActive} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p>{formatDate(new Date(details.createdAt))}</p>
                  </div>
                </div>
              </div>
              {(details.message ?? "").trim() && (
                <div className="md:col-span-2 flex items-start gap-3 p-4 rounded-lg bg-muted/20">
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Message</p>
                    <p className="text-sm">{details.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-3">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-bold">Campaign</h3>
          </div>
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Campaign</p>
              <p className="font-medium">{details.campaign.title}</p>
              <StatusBadge isActive={details.campaign.isActive} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="donations" className="mt-4">
          {details.donations.length === 0 ? (
            <p className="text-muted-foreground py-8">No donations yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={exportDonationsToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Gift Aid</TableHead>
                      <TableHead>Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.donations.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatDonorName(d.donor)}</div>
                            <div className="text-xs text-muted-foreground">
                              {displayDonorEmail(d.donor.email)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(d.amountPence)}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === "COMPLETED" ? "default" : "outline"}>
                            {d.status === "COMPLETED" ? (
                              <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
                            ) : (
                              <IconLoader className="mr-1 size-3" />
                            )}
                            {formatEnum(d.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(
                            d.completedAt ? new Date(d.completedAt) : new Date(d.createdAt)
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatPaymentMethod(d.paymentMethod)}</TableCell>
                        <TableCell className="text-sm">{formatEnum(d.donationType)}</TableCell>
                        <TableCell>
                          {d.giftAid ? (
                            <span className="flex items-center gap-1">
                              <IconCheck className="h-4 w-4 text-primary" />
                              Yes
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <IconX className="h-4 w-4" />
                              No
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">
                          {d.transactionId ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Donation statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total raised</span>
                  <span className="font-semibold">{formatCurrency(details.statistics.totalRaised)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total donations</span>
                  <span className="font-semibold">{details.statistics.donationCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average donation</span>
                  <span className="font-semibold">
                    {formatCurrency(Math.round(details.statistics.averageDonation))}
                  </span>
                </div>
                {details.targetAmountPence && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Target</span>
                      <span className="font-semibold">
                        {formatCurrency(details.targetAmountPence)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className="font-semibold">
                        {details.statistics.progressPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By donation type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(details.statistics.donationsByType).length > 0 ? (
                  Object.entries(details.statistics.donationsByType).map(([type, amount]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{formatEnum(type)}</span>
                      <span className="font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By payment method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(details.statistics.donationsByPaymentMethod).length > 0 ? (
                  Object.entries(details.statistics.donationsByPaymentMethod).map(([method, amount]) => (
                    <div key={method} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{formatEnum(method)}</span>
                      <span className="font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  ))
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
                  <span className="font-semibold">{details.statistics.giftAidCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Percentage</span>
                  <span className="font-semibold">
                    {details.statistics.giftAidPercentage.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
