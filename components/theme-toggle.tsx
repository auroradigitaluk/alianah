"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-foreground transition-colors hover:bg-primary hover:text-primary-foreground min-w-[2.25rem]"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mounted ? (
        isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5 opacity-50" />
      )}
    </Button>
  )
}
