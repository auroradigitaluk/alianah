"use client"

import { usePathname } from "next/navigation"

/** Renders the dark base + green glow gradient on public pages. Excluded for /checkout. */
export function PublicGlowBg({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""
  const isCheckout = pathname === "/checkout" || pathname.startsWith("/checkout/")

  if (isCheckout) {
    return <>{children}</>
  }

  return (
    <div className="dark">
      {/* Dark base */}
      <div className="fixed inset-0 -z-10 min-h-screen bg-[oklch(0.08_0.02_142.38)]" />
      {/* Primary green radius glow at bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 -z-10 h-[60vh] min-h-[400px]"
        style={{
          background: `radial-gradient(ellipse 110% 90% at 50% 100%, var(--color-primary) 0%, color-mix(in oklch, var(--color-primary) 75%, transparent) 12%, color-mix(in oklch, var(--color-primary) 45%, transparent) 28%, color-mix(in oklch, var(--color-primary) 22%, transparent) 45%, color-mix(in oklch, var(--color-primary) 8%, transparent) 62%, transparent 82%)`,
        }}
      />
      {children}
    </div>
  )
}
