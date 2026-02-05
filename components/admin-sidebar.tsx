"use client"

import * as React from "react"
import {
  IconDashboard,
  IconFileText,
  IconFolder,
  IconHeart,
  IconHistory,
  IconMoneybag,
  IconBuilding,
  IconRepeat,
  IconSettings,
  IconUsers,
  IconDroplet,
  IconUsersGroup,
  IconReceipt,
  IconReport,
  IconPresentationAnalytics,
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"

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
  const showReports = role !== "STAFF"
  const showAudit = role === "ADMIN"
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
        <SidebarGroup>
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

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {showDonations && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Donations"
                    isActive={pathname === "/admin/donations" || pathname?.startsWith("/admin/donations/")}
                  >
                    <Link href="/admin/donations">
                      <IconMoneybag />
                      <span>Donations</span>
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
                    <Link href="/admin/recurring">
                      <IconRepeat />
                      <span>Recurring</span>
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
                  <Link href="/admin/offline-income">
                    <IconFileText />
                    <span>Offline Income</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Collections"
                  isActive={pathname === "/admin/collections" || pathname?.startsWith("/admin/collections/")}
                >
                  <Link href="/admin/collections">
                    <IconBuilding />
                    <span>Collections</span>
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

        <SidebarGroup>
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
              {showAudit && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Audit Log"
                    isActive={pathname === "/admin/audit" || pathname?.startsWith("/admin/audit/")}
                  >
                    <Link href="/admin/audit">
                      <IconHistory />
                      <span>Audit Log</span>
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
