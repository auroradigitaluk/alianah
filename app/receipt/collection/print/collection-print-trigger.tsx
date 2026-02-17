"use client"

import { useEffect } from "react"

/** Triggers print dialog on mount so the receipt page opens print directly. */
export function CollectionPrintTrigger() {
  useEffect(() => {
    window.print()
  }, [])
  return null
}
