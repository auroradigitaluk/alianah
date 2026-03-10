"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"

/**
 * Forces light theme only while this component is mounted.
 * Used in fundraise layout so fundraising pages default to light mode;
 * when the user navigates away, the previous theme is restored.
 */
export function FundraiseThemeLight({ children }: { children: React.ReactNode }) {
  const { setTheme, theme } = useTheme()
  const previousThemeRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    previousThemeRef.current = theme ?? "system"
    setTheme("light")
    return () => {
      const prev = previousThemeRef.current
      if (prev !== undefined) {
        setTheme(prev)
        previousThemeRef.current = undefined
      }
    }
    // Only run on mount so we don't override if user toggles theme on the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
