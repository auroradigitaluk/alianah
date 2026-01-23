"use client"

import * as React from "react"
import {
  IconChartBar,
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
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
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

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Appeals",
    url: "/admin/appeals",
    icon: IconHeart,
  },
]

const waterForLifeItems = [
  {
    title: "Water Pumps",
    url: "/admin/water-projects/pumps",
  },
  {
    title: "Water Wells",
    url: "/admin/water-projects/wells",
  },
  {
    title: "Water Tanks",
    url: "/admin/water-projects/tanks",
  },
  {
    title: "Wudhu Areas",
    url: "/admin/water-projects/wudhu",
  },
  {
    title: "Manage Projects",
    url: "/admin/water-projects",
  },
]

const incomeNavItems = [
  {
    title: "Donations",
    url: "/admin/donations",
    icon: IconMoneybag,
  },
  {
    title: "Recurring",
    url: "/admin/recurring",
    icon: IconRepeat,
  },
  {
    title: "Offline Income",
    url: "/admin/offline-income",
    icon: IconFileText,
  },
  {
    title: "Collections",
    url: "/admin/collections",
    icon: IconBuilding,
  },
  {
    title: "Fundraisers",
    url: "/admin/fundraisers",
    icon: IconUsers,
  },
]

const otherNavItems = [
  {
    title: "Donors",
    url: "/admin/donors",
    icon: IconUsers,
  },
  {
    title: "Masjids",
    url: "/admin/masjids",
    icon: IconBuilding,
  },
  {
    title: "Reports",
    url: "/admin/reports",
    icon: IconChartBar,
  },
  {
    title: "Audit Log",
    url: "/admin/audit",
    icon: IconHistory,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IconSettings,
  },
]

const user = {
  name: "Admin",
  email: "admin@example.com",
  avatar: "/avatars/admin.jpg",
}

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [waterMenuOpen, setWaterMenuOpen] = React.useState(
    pathname?.startsWith("/admin/water-projects") || false
  )

  const isWaterProjectActive = pathname?.startsWith("/admin/water-projects")

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
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname?.startsWith(item.url + "/")}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                    {waterForLifeItems.map((item) => (
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
              {incomeNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname?.startsWith(item.url + "/")}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname?.startsWith(item.url + "/")}
                  >
                    <Link href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
