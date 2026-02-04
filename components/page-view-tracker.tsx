"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

export function PageViewTracker() {
  const pathname = usePathname()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    if (lastPathRef.current === pathname) return
    lastPathRef.current = pathname

    const referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined

    fetch("/api/analytics/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {})
  }, [pathname])

  return null
}
