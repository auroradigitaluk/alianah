"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { AdminGlobalSearch } from "@/components/admin-global-search"

interface AdminHeaderProps {
  title: string
  actions?: React.ReactNode
  monthFilter?: React.ReactNode
  dateFilter?: React.ReactNode
}

export function AdminHeader({ title, actions, monthFilter, dateFilter }: AdminHeaderProps) {
  const isDemo = process.env.NEXT_PUBLIC_APP_ENV === "demo"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-2 sm:px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-sm sm:text-base font-medium truncate">{title}</h1>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {dateFilter && (
            <>
              {dateFilter}
              <Separator
                orientation="vertical"
                className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
              />
            </>
          )}
          {monthFilter && (
            <>
              {monthFilter}
              <Separator
                orientation="vertical"
                className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
              />
            </>
          )}
          {actions}
          {isDemo && (
            <Badge variant="destructive" className="font-semibold">
              TEST MODE
            </Badge>
          )}
          <Separator
            orientation="vertical"
            className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4 hidden sm:block"
          />
          <AdminGlobalSearch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
