"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

export function FundraiseFooter() {
  const pathname = usePathname()
  const loginHref = `/fundraise/login?redirect=${encodeURIComponent(pathname || "/")}`

  return (
    <footer className="border-t bg-muted/30 py-6 md:py-8">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 sm:flex-row sm:justify-between sm:gap-6">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Alianah Humanity Welfare">
            <Image
              src="/logo-light.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain dark:hidden"
            />
            <Image
              src="/logo-dark.png"
              alt=""
              width={40}
              height={40}
              className="hidden h-10 w-10 object-contain dark:block"
            />
            <span className="text-sm font-medium text-foreground">Alianah Humanity Welfare</span>
          </Link>
          <p className="text-xs text-muted-foreground">Registered charity no. 1160076</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={loginHref} className="gap-2">
            <LogIn className="h-4 w-4" />
            Login
          </Link>
        </Button>
      </div>
    </footer>
  )
}
