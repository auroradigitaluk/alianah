"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import { ShoppingCart, LogIn } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useSidecart } from "@/components/sidecart-provider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export function PublicHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { items, setOpen } = useSidecart()

  const handleBack = () => {
    router.back()
  }

  const itemCount = items.length
  const isFundraisePage = pathname?.startsWith("/fundraise")

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back
          </Button>
        <div className="ml-4 text-sm text-muted-foreground">
          Alianah Humanity Welfare
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isFundraisePage && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/fundraise/login?redirect=${encodeURIComponent(pathname || "/fundraise/dashboard")}`}>
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        )}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative"
          aria-label="Open cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge
              variant="default"
              className={cn(
                "absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground",
                itemCount > 99 && "px-1"
              )}
            >
              {itemCount > 99 ? "99+" : itemCount}
            </Badge>
          )}
        </Button>
      </div>
      </div>
    </header>
  )
}
