"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { canAccessRoute } from "@/lib/admin-routes"

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [allowed, setAllowed] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    fetch("/api/admin/auth/me")
      .then(async (res) => {
        if (res.status === 401) {
          await fetch("/api/admin/auth/logout", { method: "POST" })
          window.location.href = `/admin/login?redirect=${encodeURIComponent(pathname || "/admin/dashboard")}`
          return null
        }
        return res.ok ? res.json() : null
      })
      .then((user) => {
        if (!user) {
          setAllowed(false)
          return
        }
        setAllowed(canAccessRoute(user.role, pathname || ""))
      })
      .catch(() => setAllowed(false))
  }, [pathname])

  if (allowed === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-lg font-semibold">You don&apos;t have access to this page</h2>
        <p className="text-muted-foreground text-center text-sm">
          Your account type does not have permission to view this section.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
