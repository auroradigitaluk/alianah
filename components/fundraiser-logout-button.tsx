"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function FundraiserLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch("/api/fundraisers/logout", {
        method: "POST",
      })
      router.push("/fundraise/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  )
}
