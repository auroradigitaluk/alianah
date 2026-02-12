"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminRouteGuard } from "@/components/admin-route-guard"
import { InitialLoader } from "@/components/initial-loader"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

const AUTH_PATHS = ["/login", "/login/otp", "/login/set-password", "/login/forgot-password"]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"))
  const [showInitialLoader, setShowInitialLoader] = React.useState(true)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const key = "admin-initial-loader"
    if (sessionStorage.getItem(key) === "done") {
      setShowInitialLoader(false)
      return
    }

    const markDone = () => {
      setShowInitialLoader(false)
      sessionStorage.setItem(key, "done")
    }

    if (document.readyState === "complete") {
      markDone()
      return
    }

    window.addEventListener("load", markDone)
    return () => window.removeEventListener("load", markDone)
  }, [])

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <AdminRouteGuard>{children}</AdminRouteGuard>
      </SidebarInset>
      {showInitialLoader && (
        <div className="fixed inset-0 z-50">
          <InitialLoader />
        </div>
      )}
    </SidebarProvider>
  )
}
