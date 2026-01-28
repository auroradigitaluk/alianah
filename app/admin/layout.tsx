"use client"

import * as React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { InitialLoader } from "@/components/initial-loader"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
        {children}
      </SidebarInset>
      {showInitialLoader && (
        <div className="fixed inset-0 z-50">
          <InitialLoader />
        </div>
      )}
    </SidebarProvider>
  )
}
