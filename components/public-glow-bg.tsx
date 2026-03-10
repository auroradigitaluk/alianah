"use client"

import { usePathname } from "next/navigation"

/** Renders the dark base + green glow on public pages. Fundraise routes use a subtle tint; checkout has no glow. */
export function PublicGlowBg({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""
  const isCheckout = pathname === "/checkout" || pathname.startsWith("/checkout/")
  const isFundraise = pathname === "/fundraise" || pathname.startsWith("/fundraise/")
  const isFundraiserHub = pathname === "/fundraiser" || pathname.startsWith("/fundraiser/")

  if (isCheckout) {
    return <>{children}</>
  }

  // Fundraiser hub + fundraise: theme-aware background + subtle green tint (works in both light and dark mode)
  if (isFundraiserHub || isFundraise) {
    return (
      <div className="min-h-screen">
        <div className="fixed inset-0 -z-10 min-h-screen bg-[oklch(0.98_0.01_142)] dark:bg-[oklch(0.12_0.02_142)]" />
        <div
          className="fixed bottom-0 left-0 right-0 -z-10 h-[50vh] min-h-[320px] opacity-40"
          style={{
            background: `radial-gradient(ellipse 110% 90% at 50% 100%, var(--color-primary) 0%, color-mix(in oklch, var(--color-primary) 30%, transparent) 40%, transparent 75%)`,
          }}
        />
        {children}
      </div>
    )
  }

  return (
    <div className="dark">
      <div className="fixed inset-0 -z-10 min-h-screen bg-[oklch(0.08_0.02_142.38)]" />
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
