"use client"

import * as React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import { ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSidecart } from "@/components/sidecart-provider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export function PublicHeader() {
  const router = useRouter()
  const { items, setOpen } = useSidecart()

  const handleBack = () => {
    router.back()
  }

  const itemCount = items.length

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
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
        <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Image
            src="/logo-light.png"
            alt="Alianah"
            width={24}
            height={24}
            className="h-5 w-5 object-contain dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt="Alianah"
            width={24}
            height={24}
            className="hidden h-5 w-5 object-contain dark:block"
          />
          <span className="text-foreground font-semibold">Alianah Humanity Welfare</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <nav className="hidden md:flex items-center gap-1 mr-4" aria-label="Main">
          <Link
            href="/"
            className="px-3 py-2 text-sm font-medium text-foreground rounded-md hover:bg-muted/50 transition-colors"
          >
            Appeals
          </Link>
          <Link
            href="/zakat"
            className="px-3 py-2 text-sm font-medium text-foreground rounded-md hover:bg-muted/50 transition-colors"
          >
            Zakat
          </Link>
          <Link
            href="/water"
            className="px-3 py-2 text-sm font-medium text-foreground rounded-md hover:bg-muted/50 transition-colors"
          >
            Water
          </Link>
          <Link
            href="/sponsors"
            className="px-3 py-2 text-sm font-medium text-foreground rounded-md hover:bg-muted/50 transition-colors"
          >
            Sponsor
          </Link>
        </nav>
        <span className="hidden md:inline-flex items-center mr-4" aria-hidden>
          <span className="w-px h-6 bg-foreground/80" />
        </span>
        <span className="hidden md:inline-flex">
          <ThemeToggle />
        </span>
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
