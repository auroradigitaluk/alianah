"use client"

import * as React from "react"
import { Sidecart } from "@/components/sidecart"
import { toast } from "sonner"

interface CartItem {
  id: string
  appealId?: string // Optional for water projects
  appealTitle: string
  fundraiserId?: string
  productId?: string
  productName?: string
  frequency: "ONE_OFF" | "MONTHLY" | "YEARLY"
  donationType: "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"
  amountPence: number
  // Water project specific fields
  waterProjectId?: string
  waterProjectCountryId?: string
  plaqueName?: string
  // Sponsorship specific fields
  sponsorshipProjectId?: string
  sponsorshipCountryId?: string
  sponsorshipProjectType?: string
}

interface SidecartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SidecartContext = React.createContext<SidecartContextType | undefined>(undefined)

export function SidecartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([])
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const stored = localStorage.getItem("cart")
    if (stored) {
      try {
        setItems(JSON.parse(stored))
      } catch {
        setItems([])
      }
    }
  }, [])

  React.useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items])

  const addItem = React.useCallback((item: CartItem) => {
    setItems((prev) => {
      // Stripe Checkout can't mix one-off + subscription items in one session.
      if (prev.length > 0 && prev[0]?.frequency !== item.frequency) {
        toast.error("Please checkout one-off and recurring donations separately.")
        return prev
      }
      const baseId =
        item.appealId ||
        item.waterProjectId ||
        item.sponsorshipProjectId ||
        "item"
      const newItem = { ...item, id: `${baseId}-${item.productId || "direct"}-${Date.now()}` }
      return [...prev, newItem]
    })
    setOpen(true)
  }, [])

  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clearCart = React.useCallback(() => {
    setItems([])
    localStorage.removeItem("cart")
  }, [])

  return (
    <SidecartContext.Provider value={{ items, addItem, removeItem, clearCart, open, setOpen }}>
      {children}
      <Sidecart />
    </SidecartContext.Provider>
  )
}

export function useSidecart() {
  const context = React.useContext(SidecartContext)
  if (!context) {
    throw new Error("useSidecart must be used within SidecartProvider")
  }
  return context
}
