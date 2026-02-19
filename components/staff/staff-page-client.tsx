"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminTable } from "@/components/admin-table"
import { ChartPieSimple } from "@/components/chart-pie-simple"
import { OfflineIncomeDetailDialog, type OfflineIncomeItem } from "@/components/offline-income-detail-dialog"
import { CollectionDetailDialog, type CollectionItem } from "@/components/collection-detail-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AdminUsersCard } from "@/components/admin-users-card"
import { RecentActivity } from "@/components/recent-activity"
import { formatCurrency, formatAdminUserName, formatEnum, formatDate } from "@/lib/utils"
import { IconLoader2, IconWallet, IconBuilding, IconDroplet, IconUsersGroup, IconChartBar, IconHistory } from "@tabler/icons-react"
import { Wallet, Globe, Building2 } from "lucide-react"
import { toast } from "sonner"

type StaffUser = {
  id: string
  email: string
  role: string
  firstName: string | null
  lastName: string | null
  createdAt: string
}

type StaffDashboardData = {
  range: { start: string; end: string }
  summary: {
    totalAmountPence: number
    totalFormatted: string
    offlineIncomePence: number
    collectionsPence: number
    waterDonationsPence: number
    sponsorshipDonationsPence: number
    counts: {
      offlineIncome: number
      collections: number
      waterDonations: number
      sponsorshipDonations: number
    }
  }
  paymentBreakdown: Array<{
    label: string
    amountPence: number
    count: number
  }>
}

type StaffDetailsData = {
  offlineIncome: Array<{
    id: string
    amountPence: number
    donationType: string
    source: string
    receivedAt: string
    notes: string | null
    appealTitle: string | null
  }>
  collections: Array<{
    id: string
    amountPence: number
    donationType: string
    type: string
    collectedAt: string
    notes: string | null
    masjidName: string | null
    appealTitle: string | null
  }>
  waterDonations: Array<{
    id: string
    amountPence: number
    donationType: string
    projectType: string | null
    location: string | null
    country: string | null
    donorName: string | null
    createdAt: string
  }>
  sponsorshipDonations: Array<{
    id: string
    amountPence: number
    donationType: string
    projectType: string | null
    location: string | null
    country: string | null
    donorName: string | null
    createdAt: string
  }>
}

const dateRangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
]

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

export function StaffPageClient() {
  const [users, setUsers] = React.useState<StaffUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedUser, setSelectedUser] = React.useState<StaffUser | null>(null)
  const [modalLoading, setModalLoading] = React.useState(false)
  const [dashboardData, setDashboardData] = React.useState<StaffDashboardData | null>(null)
  const [staffDetails, setStaffDetails] = React.useState<StaffDetailsData | null>(null)
  /** Full activity feed (logins, logouts, added donations, masjids, bookings, etc.) for Activity tab */
  const [staffActivityFeed, setStaffActivityFeed] = React.useState<
    Array<{ type: string; message: string; timestamp: string }>
  >([])
  const [dateRange, setDateRange] = React.useState("30d")
  const [donationDetail, setDonationDetail] = React.useState<{
    type: "offline" | "collection" | "water" | "sponsorship"
    id: string
    projectType?: string | null
  } | null>(null)
  const [donationDetailItem, setDonationDetailItem] = React.useState<
    OfflineIncomeItem | CollectionItem | null
  >(null)
  const [donationDetailLoading, setDonationDetailLoading] = React.useState(false)
  const router = useRouter()

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/staff")
      if (!res.ok) throw new Error("Failed to load staff")
      const data = (await res.json()) as StaffUser[]
      setUsers(data)
    } catch {
      toast.error("Failed to load staff")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const fetchStaffData = React.useCallback(
    async (staffId: string, rangeOverride?: string) => {
      setModalLoading(true)
      setStaffDetails(null)
      setStaffActivityFeed([])
      try {
        const rangeToUse = rangeOverride ?? dateRange
        const params = new URLSearchParams({ staffId, range: rangeToUse })
        const [dashboardRes, detailsRes, activityRes] = await Promise.all([
          fetch(`/api/admin/staff-dashboard?${params}`),
          fetch(`/api/admin/staff-dashboard/details?${params}`),
          fetch(`/api/admin/staff-dashboard/activity?staffId=${encodeURIComponent(staffId)}`),
        ])
        if (!dashboardRes.ok) throw new Error("Failed to load dashboard")
        if (!detailsRes.ok) throw new Error("Failed to load details")
        const [dashboardDataRes, detailsDataRes] = await Promise.all([
          dashboardRes.json() as Promise<StaffDashboardData>,
          detailsRes.json() as Promise<StaffDetailsData>,
        ])
        setDashboardData(dashboardDataRes)
        setStaffDetails(detailsDataRes)
        if (activityRes.ok) {
          const activityData = (await activityRes.json()) as {
            activities: Array<{ type: string; message: string; timestamp: string }>
          }
          setStaffActivityFeed(activityData.activities ?? [])
        } else {
          const errText = await activityRes.text()
          console.error("Staff activity API failed:", activityRes.status, errText)
          toast.error("Could not load activity")
        }
      } catch {
        toast.error("Failed to load staff data")
      } finally {
        setModalLoading(false)
      }
    },
    [dateRange]
  )

  /** Activity tab: full feed (logins, logouts, added donations, masjids, bookings, etc.) with timestamps */
  const staffActivities = React.useMemo(
    () =>
      staffActivityFeed.map((a) => ({
        type: a.type,
        message: a.message,
        timestamp: new Date(a.timestamp),
      })),
    [staffActivityFeed]
  )

  const handleOpenModal = React.useCallback(
    (user: StaffUser) => {
      setSelectedUser(user)
      setDashboardData(null)
      fetchStaffData(user.id)
    },
    [fetchStaffData]
  )

  const handleDateRangeChange = React.useCallback(
    (value: string) => {
      setDateRange(value)
      if (selectedUser) {
        fetchStaffData(selectedUser.id, value)
      }
    },
    [selectedUser, fetchStaffData]
  )

  const WATER_PROJECT_SLUG: Record<string, string> = {
    WATER_PUMP: "pumps",
    WATER_WELL: "wells",
    WATER_TANK: "tanks",
    WUDHU_AREA: "wudhu",
  }
  const SPONSORSHIP_SLUG: Record<string, string> = {
    ORPHANS: "orphans",
    HIFZ: "hifz",
    FAMILIES: "families",
  }

  const handleDonationClick = React.useCallback(
    async (
      type: "offline" | "collection" | "water" | "sponsorship",
      id: string,
      projectType?: string | null,
      staffId?: string
    ) => {
      setSelectedUser(null)
      if (type === "offline") {
        setDonationDetailLoading(true)
        setDonationDetail({ type, id, projectType })
        try {
          const res = await fetch(`/api/admin/offline-income/${id}`)
          if (!res.ok) throw new Error("Failed to load")
          const data = (await res.json()) as OfflineIncomeItem
          setDonationDetailItem(data)
        } catch {
          toast.error("Failed to load donation details")
          setDonationDetail(null)
        } finally {
          setDonationDetailLoading(false)
        }
      } else if (type === "collection") {
        setDonationDetailLoading(true)
        setDonationDetail({ type, id, projectType })
        try {
          const res = await fetch(`/api/admin/collections/${id}`)
          if (!res.ok) throw new Error("Failed to load")
          const data = (await res.json()) as CollectionItem
          setDonationDetailItem(data)
        } catch {
          toast.error("Failed to load donation details")
          setDonationDetail(null)
        } finally {
          setDonationDetailLoading(false)
        }
      } else if (type === "water" && projectType) {
        const slug = WATER_PROJECT_SLUG[projectType] ?? "pumps"
        const staffParam = staffId ? `&staff=${staffId}` : ""
        router.push(`/admin/water-projects/${slug}?open=${id}${staffParam}`)
      } else if (type === "sponsorship" && projectType) {
        const slug = SPONSORSHIP_SLUG[projectType] ?? "orphans"
        const staffParam = staffId ? `&staff=${staffId}` : ""
        router.push(`/admin/sponsorships/${slug}?open=${id}${staffParam}`)
      }
    },
    [router]
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="portal" className="w-full">
        <TabsList className="w-fit">
          <TabsTrigger value="portal" className="gap-1.5">
            <IconUsersGroup className="size-4" />
            Portal Accounts
          </TabsTrigger>
          <TabsTrigger value="admin-users" className="gap-1.5">
            Manage Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portal" className="mt-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Portal Accounts</h2>
            <p className="text-sm text-muted-foreground mt-1">
              All admin, staff, and viewer accounts. Click an account to view their activity and linked data.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <AdminTable
              data={users}
              onRowClick={handleOpenModal}
              columns={[
                {
                  id: "name",
                  header: "Name",
                  cell: (user) => (
                    <div className="font-medium">
                      {formatAdminUserName(user) || user.email}
                    </div>
                  ),
                },
                {
                  id: "email",
                  header: "Email",
                  cell: (user) => (
                    <div className="text-muted-foreground text-sm">{user.email}</div>
                  ),
                },
                {
                  id: "role",
                  header: "Role",
                  cell: (user) => (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {formatRole(user.role)}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="admin-users" className="mt-6">
          <AdminUsersCard />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser
                ? `${formatAdminUserName(selectedUser) || selectedUser.email} — Activity`
                : "Staff Activity"}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Date range</Label>
                  <Select value={dateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRangeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {modalLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : dashboardData ? (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="flex w-full flex-wrap gap-1">
                    <TabsTrigger value="overview" className="gap-1.5">
                      <IconChartBar className="size-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="offline" className="gap-1.5">
                      <IconWallet className="size-4" />
                      Offline
                      {dashboardData.summary.counts.offlineIncome > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
                          {dashboardData.summary.counts.offlineIncome}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="collections" className="gap-1.5">
                      <IconBuilding className="size-4" />
                      Collections
                      {dashboardData.summary.counts.collections > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
                          {dashboardData.summary.counts.collections}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="water" className="gap-1.5">
                      <IconDroplet className="size-4" />
                      Water
                      {dashboardData.summary.counts.waterDonations > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
                          {dashboardData.summary.counts.waterDonations}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="sponsorships" className="gap-1.5">
                      <IconUsersGroup className="size-4" />
                      Sponsorships
                      {dashboardData.summary.counts.sponsorshipDonations > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
                          {dashboardData.summary.counts.sponsorshipDonations}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-1.5">
                      <IconHistory className="size-4" />
                      Activity
                      {staffActivities.length > 0 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs">
                          {staffActivities.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4 space-y-6">
                  {/* Top Row: 4 Metric Cards - matches staff dashboard */}
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Total Amount */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-card border-primary/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Wallet className="h-4 w-4 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">
                          {dashboardData.summary.totalFormatted}
                        </div>
                        {dashboardData.summary.totalAmountPence === 0 ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            No donations logged yet
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dashboardData.summary.counts.offlineIncome +
                              dashboardData.summary.counts.collections +
                              dashboardData.summary.counts.waterDonations +
                              dashboardData.summary.counts.sponsorshipDonations}{" "}
                            entries
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Water & Sponsor */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-card border-cyan-500/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Water & Sponsor</CardTitle>
                        <div className="rounded-lg bg-cyan-500/10 p-2">
                          <Globe className="h-4 w-4 text-cyan-600" />
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">
                          {formatCurrency(
                            dashboardData.summary.waterDonationsPence +
                              dashboardData.summary.sponsorshipDonationsPence
                          )}
                        </div>
                        {dashboardData.summary.waterDonationsPence +
                          dashboardData.summary.sponsorshipDonationsPence ===
                        0 ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            No water or sponsor donations logged
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dashboardData.summary.counts.waterDonations +
                              dashboardData.summary.counts.sponsorshipDonations}{" "}
                            entries
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Total Offline */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-card border-purple-500/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Total Offline</CardTitle>
                        <div className="rounded-lg bg-purple-500/10 p-2">
                          <Wallet className="h-4 w-4 text-purple-600" />
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">
                          {formatCurrency(dashboardData.summary.offlineIncomePence)}
                        </div>
                        {dashboardData.summary.offlineIncomePence === 0 ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            No offline income logged
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dashboardData.summary.counts.offlineIncome} entries
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Total Collections */}
                    <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-card border-orange-500/20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                        <div className="rounded-lg bg-orange-500/10 p-2">
                          <Building2 className="h-4 w-4 text-orange-600" />
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="text-2xl font-bold">
                          {formatCurrency(dashboardData.summary.collectionsPence)}
                        </div>
                        {dashboardData.summary.collectionsPence === 0 ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            No collections recorded yet
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            {dashboardData.summary.counts.collections} entries
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Second Row: Pie Chart and Payment Breakdown - matches staff dashboard */}
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                    <div className="flex w-full">
                      <div className="w-full">
                        <ChartPieSimple
                          data={dashboardData.paymentBreakdown
                            .filter((p) => p.amountPence > 0)
                            .map((p) => ({
                              name: p.label
                                .toLowerCase()
                                .replace(/\s+/g, "_")
                                .replace(/[()]/g, ""),
                              value: p.amountPence,
                              label: p.label,
                            }))}
                        />
                      </div>
                    </div>
                    <div className="flex w-full">
                      <Card className="flex flex-col w-full">
                        <CardHeader>
                          <CardTitle>Payment Breakdown</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            By source
                          </p>
                        </CardHeader>
                        <CardContent className="flex-1">
                          {dashboardData.paymentBreakdown.some((p) => p.amountPence > 0) ? (
                            <div className="space-y-3">
                              {dashboardData.paymentBreakdown
                                .filter((p) => p.amountPence > 0)
                                .map((p) => (
                                  <div
                                    key={p.label}
                                    className="flex items-center justify-between"
                                  >
                                    <p className="font-medium text-sm">{p.label}</p>
                                    <p className="font-semibold text-sm">
                                      {formatCurrency(p.amountPence)}
                                      {p.count > 0 && (
                                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                                          ({p.count})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No activity in this period
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  </TabsContent>

                  <TabsContent value="offline" className="mt-4">
                    {staffDetails && (
                      <div className="overflow-hidden rounded-lg border">
                        <AdminTable
                          data={staffDetails.offlineIncome}
                          onRowClick={(r) =>
                            handleDonationClick("offline", r.id, undefined, selectedUser?.id)
                          }
                          columns={[
                            { id: "receivedAt", header: "Date", cell: (r) => formatDate(r.receivedAt) },
                            { id: "amountPence", header: "Amount", cell: (r) => formatCurrency(r.amountPence) },
                            { id: "donationType", header: "Type", cell: (r) => formatEnum(r.donationType) },
                            { id: "source", header: "Source", cell: (r) => formatEnum(r.source) },
                            { id: "appealTitle", header: "Appeal", cell: (r) => r.appealTitle ?? "—" },
                            { id: "notes", header: "Notes", cell: (r) => (r.notes ? r.notes.slice(0, 40) + (r.notes.length > 40 ? "…" : "") : "—") },
                          ]}
                        />
                      </div>
                    )}
                    {staffDetails?.offlineIncome.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No offline income in this period</p>
                    )}
                  </TabsContent>

                  <TabsContent value="collections" className="mt-4">
                    {staffDetails && (
                      <div className="overflow-hidden rounded-lg border">
                        <AdminTable
                          data={staffDetails.collections}
                          onRowClick={(r) =>
                            handleDonationClick("collection", r.id, undefined, selectedUser?.id)
                          }
                          columns={[
                            { id: "collectedAt", header: "Date", cell: (r) => formatDate(r.collectedAt) },
                            { id: "amountPence", header: "Amount", cell: (r) => formatCurrency(r.amountPence) },
                            { id: "donationType", header: "Type", cell: (r) => formatEnum(r.donationType) },
                            { id: "type", header: "Collection", cell: (r) => formatEnum(r.type) },
                            { id: "masjidName", header: "Masjid", cell: (r) => r.masjidName ?? "—" },
                            { id: "appealTitle", header: "Appeal", cell: (r) => r.appealTitle ?? "—" },
                          ]}
                        />
                      </div>
                    )}
                    {staffDetails?.collections.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No collections in this period</p>
                    )}
                  </TabsContent>

                  <TabsContent value="water" className="mt-4">
                    {staffDetails && (
                      <div className="overflow-hidden rounded-lg border">
                        <AdminTable
                          data={staffDetails.waterDonations}
                          onRowClick={(r) =>
                            handleDonationClick("water", r.id, r.projectType, selectedUser?.id)
                          }
                          columns={[
                            { id: "createdAt", header: "Date", cell: (r) => formatDate(r.createdAt) },
                            { id: "amountPence", header: "Amount", cell: (r) => formatCurrency(r.amountPence) },
                            { id: "donationType", header: "Type", cell: (r) => formatEnum(r.donationType) },
                            { id: "projectType", header: "Project", cell: (r) => formatEnum(r.projectType ?? "") || "—" },
                            { id: "country", header: "Country", cell: (r) => r.country ?? "—" },
                            { id: "donorName", header: "Donor", cell: (r) => r.donorName ?? "—" },
                          ]}
                        />
                      </div>
                    )}
                    {staffDetails?.waterDonations.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No water donations in this period</p>
                    )}
                  </TabsContent>

                  <TabsContent value="sponsorships" className="mt-4">
                    {staffDetails && (
                      <div className="overflow-hidden rounded-lg border">
                        <AdminTable
                          data={staffDetails.sponsorshipDonations}
                          onRowClick={(r) =>
                            handleDonationClick("sponsorship", r.id, r.projectType, selectedUser?.id)
                          }
                          columns={[
                            { id: "createdAt", header: "Date", cell: (r) => formatDate(r.createdAt) },
                            { id: "amountPence", header: "Amount", cell: (r) => formatCurrency(r.amountPence) },
                            { id: "donationType", header: "Type", cell: (r) => formatEnum(r.donationType) },
                            { id: "projectType", header: "Project", cell: (r) => formatEnum(r.projectType ?? "") || "—" },
                            { id: "country", header: "Country", cell: (r) => r.country ?? "—" },
                            { id: "donorName", header: "Donor", cell: (r) => r.donorName ?? "—" },
                          ]}
                        />
                      </div>
                    )}
                    {staffDetails?.sponsorshipDonations.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">No sponsorship donations in this period</p>
                    )}
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4">
                    <RecentActivity
                      activities={staffActivities}
                      subtitle="Logins, logouts, and everything this account has added (donations, collections, masjids, bookings, etc.)"
                      showExactDateTime
                    />
                  </TabsContent>
                </Tabs>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {donationDetailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {donationDetail?.type === "offline" && (
        <OfflineIncomeDetailDialog
          item={donationDetailItem as OfflineIncomeItem | null}
          open={!!donationDetail}
          onOpenChange={(open) => {
            if (!open) {
              setDonationDetail(null)
              setDonationDetailItem(null)
            }
          }}
          canEdit={false}
          showLoggedBy
        />
      )}

      {donationDetail?.type === "collection" && (
        <CollectionDetailDialog
          item={donationDetailItem as CollectionItem | null}
          open={!!donationDetail}
          onOpenChange={(open) => {
            if (!open) {
              setDonationDetail(null)
              setDonationDetailItem(null)
            }
          }}
          canEdit={false}
          showLoggedBy
        />
      )}
    </div>
  )
}
