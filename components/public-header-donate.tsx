"use client"

import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"

export function DonateHeader() {

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
            <span className="text-foreground font-semibold">
              Alianah Humanity Welfare
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

