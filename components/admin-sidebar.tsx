"use client"

import * as React from "react"
import {
  IconDashboard,
  IconFileText,
  IconFolder,
  IconHeart,
  IconMoneybag,
  IconBuilding,
  IconCalendarEvent,
  IconRepeat,
  IconSettings,
  IconUsers,
  IconUserHeart,
  IconDroplet,
  IconUsersGroup,
  IconReceipt,
  IconReport,
  IconPresentationAnalytics,
  IconListCheck,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AdminNavUser } from "@/components/admin-nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

type NotificationCounts = {
  donations: number
  recurring: number
  "offline-income": number
  collections: number
  tasks: number
}

function pathnameToPageKey(pathname: string | null): keyof NotificationCounts | null {
  if (!pathname) return null
  if (pathname === "/admin/tasks" || pathname.startsWith("/admin/tasks/")) return "tasks"
  if (pathname === "/admin/donations" || pathname.startsWith("/admin/donations/")) return "donations"
  if (pathname === "/admin/recurring" || pathname.startsWith("/admin/recurring/")) return "recurring"
  if (pathname === "/admin/offline-income" || pathname.startsWith("/admin/offline-income/")) return "offline-income"
  if (pathname === "/admin/collections" || pathname.startsWith("/admin/collections/")) return "collections"
  return null
}

function useNotificationCounts(pathname: string | null) {
  const [counts, setCounts] = React.useState<NotificationCounts>({
    donations: 0,
    recurring: 0,
    "offline-income": 0,
    collections: 0,
    tasks: 0,
  })

  const refetch = React.useCallback(() => {
    fetch("/api/admin/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCounts(data))
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    refetch()
  }, [refetch])

  React.useEffect(() => {
    const pageKey = pathnameToPageKey(pathname)
    if (!pageKey) return
    fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: pageKey }),
    })
      .then((res) => {
        if (res.ok) setCounts((c) => ({ ...c, [pageKey]: 0 }))
      })
      .catch(() => {})
  }, [pathname])

  return { counts, refetch }
}

function NotificationBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  const display = count > 99 ? "99+" : String(count)
  return (
    <span
      className={cn(
        "ml-auto flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-sidebar-accent px-1.5 text-xs font-semibold tabular-nums text-sidebar-accent-foreground shadow-sm ring-2 ring-sidebar",
        className
      )}
    >
      {display}
    </span>
  )
}

const waterForLifeItems = [
  { title: "Water Pumps", url: "/admin/water-projects/pumps", hideForStaff: false },
  { title: "Water Wells", url: "/admin/water-projects/wells", hideForStaff: false },
  { title: "Water Tanks", url: "/admin/water-projects/tanks", hideForStaff: false },
  { title: "Wudhu Areas", url: "/admin/water-projects/wudhu", hideForStaff: false },
  { title: "Manage Projects", url: "/admin/water-projects", hideForStaff: true },
]

const sponsorshipItems = [
  { title: "Orphans", url: "/admin/sponsorships/orphans", hideForStaff: false },
  { title: "Hifz", url: "/admin/sponsorships/hifz", hideForStaff: false },
  { title: "Families", url: "/admin/sponsorships/families", hideForStaff: false },
  { title: "Manage Projects", url: "/admin/sponsorships", hideForStaff: true },
]

function useAdminRole() {
  const [role, setRole] = React.useState<string | null>(null)
  React.useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRole(data?.role ?? null))
      .catch(() => setRole(null))
  }, [])
  return role
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const role = useAdminRole()
  const { counts } = useNotificationCounts(pathname)
  const [waterMenuOpen, setWaterMenuOpen] = React.useState(
    pathname?.startsWith("/admin/water-projects") || false
  )
  const [sponsorshipMenuOpen, setSponsorshipMenuOpen] = React.useState(
    pathname?.startsWith("/admin/sponsorships") || false
  )

  const isWaterProjectActive = pathname?.startsWith("/admin/water-projects")
  const isSponsorshipActive = pathname?.startsWith("/admin/sponsorships")

  const showAppeals = role !== "STAFF"
  const showDonations = role !== "STAFF"
  const showRecurring = role !== "STAFF"
  const showGiftAid = role !== "STAFF"
  const showDonors = role === "ADMIN"
  const showMasjids = role !== "VIEWER"
  const showDocuments = role === "ADMIN"
  const showStaff = role === "ADMIN"
  const showVolunteers = role === "ADMIN"
  const showTasks = role === "ADMIN" || role === "STAFF"
  const showDistributions = role === "ADMIN"
  const showReports = role !== "STAFF"
  const showAnalytics = role === "ADMIN"
  const showSettings = role === "ADMIN"

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/admin/dashboard">
                <span className="text-base font-semibold">Alianah Humanity Welfare</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Overview */}
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Dashboard"
                  isActive={pathname === "/admin/dashboard" || pathname?.startsWith("/admin/dashboard/")}
                >
                  <Link href="/admin/dashboard">
                    <IconDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Campaigns & Projects */}
        <SidebarGroup>
          <SidebarGroupLabel>Campaigns & Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showAppeals && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Appeals"
                    isActive={pathname === "/admin/appeals" || pathname?.startsWith("/admin/appeals/")}
                  >
                    <Link href="/admin/appeals">
                      <IconHeart />
                      <span>Appeals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Water for Life"
                  isActive={isWaterProjectActive}
                  onClick={() => setWaterMenuOpen(!waterMenuOpen)}
                >
                  <IconDroplet />
                  <span>Water for Life</span>
                  {waterMenuOpen ? (
                    <IconChevronDown className="ml-auto" />
                  ) : (
                    <IconChevronRight className="ml-auto" />
                  )}
                </SidebarMenuButton>
                {waterMenuOpen && (
                  <SidebarMenuSub>
                    {waterForLifeItems
                      .filter((item) => role !== "STAFF" || !item.hideForStaff)
                      .map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === item.url}
                          >
                            <Link href={item.url}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sponsorships"
                  isActive={isSponsorshipActive}
                  onClick={() => setSponsorshipMenuOpen(!sponsorshipMenuOpen)}
                >
                  <IconUsersGroup />
                  <span>Sponsorships</span>
                  {sponsorshipMenuOpen ? (
                    <IconChevronDown className="ml-auto" />
                  ) : (
                    <IconChevronRight className="ml-auto" />
                  )}
                </SidebarMenuButton>
                {sponsorshipMenuOpen && (
                  <SidebarMenuSub>
                    {sponsorshipItems
                      .filter((item) => role !== "STAFF" || !item.hideForStaff)
                      .map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === item.url}
                          >
                            <Link href={item.url}>
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Income & Donations */}
        <SidebarGroup>
          <SidebarGroupLabel>Income & Donations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showDonations && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Donations"
                    isActive={pathname === "/admin/donations" || pathname?.startsWith("/admin/donations/")}
                  >
                    <Link href="/admin/donations" className="flex w-full items-center gap-2">
                      <IconMoneybag />
                      <span>Donations</span>
                      <NotificationBadge count={counts.donations} />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showRecurring && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Recurring"
                    isActive={pathname === "/admin/recurring" || pathname?.startsWith("/admin/recurring/")}
                  >
                    <Link href="/admin/recurring" className="flex w-full items-center gap-2">
                      <IconRepeat />
                      <span>Recurring</span>
                      <NotificationBadge count={counts.recurring} />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Offline Income"
                  isActive={pathname === "/admin/offline-income" || pathname?.startsWith("/admin/offline-income/")}
                >
                  <Link href="/admin/offline-income" className="flex w-full items-center gap-2">
                    <IconFileText />
                    <span>Offline Income</span>
                    <NotificationBadge count={counts["offline-income"]} />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Collections"
                  isActive={pathname === "/admin/collections" || pathname?.startsWith("/admin/collections/")}
                >
                  <Link href="/admin/collections" className="flex w-full items-center gap-2">
                    <IconBuilding />
                    <span>Collections</span>
                    <NotificationBadge count={counts.collections} />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Bookings"
                  isActive={pathname === "/admin/bookings" || pathname?.startsWith("/admin/bookings/")}
                >
                  <Link href="/admin/bookings">
                    <IconCalendarEvent />
                    <span>Bookings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Fundraisers"
                  isActive={pathname === "/admin/fundraisers" || pathname?.startsWith("/admin/fundraisers/")}
                >
                  <Link href="/admin/fundraisers">
                    <IconUsers />
                    <span>Fundraisers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {showGiftAid && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Gift Aid"
                    isActive={pathname === "/admin/giftaid" || pathname?.startsWith("/admin/giftaid/")}
                  >
                    <Link href="/admin/giftaid">
                      <IconReceipt />
                      <span>Gift Aid</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* People & Places */}
        <SidebarGroup>
          <SidebarGroupLabel>People & Places</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showDonors && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Donors"
                    isActive={pathname === "/admin/donors" || pathname?.startsWith("/admin/donors/")}
                  >
                    <Link href="/admin/donors">
                      <IconUsers />
                      <span>Donors</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showMasjids && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Masjids"
                    isActive={pathname === "/admin/masjids" || pathname?.startsWith("/admin/masjids/")}
                  >
                    <Link href="/admin/masjids">
                      <IconBuilding />
                      <span>Masjids</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showTasks && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Tasks"
                    isActive={pathname === "/admin/tasks" || pathname?.startsWith("/admin/tasks/")}
                  >
                    <Link href="/admin/tasks" className="flex w-full items-center gap-2">
                      <IconListCheck />
                      <span>Tasks</span>
                      <NotificationBadge count={counts.tasks} />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showDistributions && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Distributions"
                    isActive={pathname === "/admin/distributions" || pathname?.startsWith("/admin/distributions/")}
                  >
                    <Link href="/admin/distributions" className="flex w-full items-center gap-2">
                      <IconReceipt />
                      <span>Distributions</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team */}
        <SidebarGroup>
          <SidebarGroupLabel>Team</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showStaff && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Staff"
                    isActive={pathname === "/admin/staff" || pathname?.startsWith("/admin/staff/")}
                  >
                    <Link href="/admin/staff">
                      <IconUsers />
                      <span>Staff</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showVolunteers && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Volunteers"
                    isActive={pathname === "/admin/volunteers" || pathname?.startsWith("/admin/volunteers/")}
                  >
                    <Link href="/admin/volunteers">
                      <IconUserHeart />
                      <span>Volunteers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content & Insights */}
        <SidebarGroup>
          <SidebarGroupLabel>Content & Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showDocuments && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Documents"
                    isActive={pathname === "/admin/documents" || pathname?.startsWith("/admin/documents/")}
                  >
                    <Link href="/admin/documents">
                      <IconFolder />
                      <span>Documents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showReports && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Reports"
                    isActive={pathname === "/admin/reports" || pathname?.startsWith("/admin/reports/")}
                  >
                    <Link href="/admin/reports">
                      <IconReport />
                      <span>Reports</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showAnalytics && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Analytics"
                    isActive={pathname === "/admin/analytics" || pathname?.startsWith("/admin/analytics/")}
                  >
                    <Link href="/admin/analytics">
                      <IconPresentationAnalytics />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {showSettings && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Settings"
                    isActive={pathname === "/admin/settings" || pathname?.startsWith("/admin/settings/")}
                  >
                    <Link href="/admin/settings">
                      <IconSettings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AdminNavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
