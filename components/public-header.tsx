"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import { useRouter } from "next/navigation"

export function PublicHeader() {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== "undefined" && document.referrer) {
      router.back()
    } else {
      window.location.href = "https://alianah.org"
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
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
    </header>
  )
}
