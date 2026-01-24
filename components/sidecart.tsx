"use client"

import * as React from "react"
import Link from "next/link"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { IconX } from "@tabler/icons-react"
import { useSidecart } from "@/components/sidecart-provider"
import { formatCurrency, formatEnum } from "@/lib/utils"

export function Sidecart() {
  const { items, removeItem, clearCart, open, setOpen } = useSidecart()

  const subtotalPence = items.reduce((sum, item) => sum + item.amountPence, 0)
  const totalPence = subtotalPence

  const frequencyLabels: Record<string, string> = {
    ONE_OFF: "One-off",
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-xl font-semibold">Your Basket</SheetTitle>
          <SheetDescription>
            {items.length === 0 ? "Your basket is empty" : `${items.length} item${items.length !== 1 ? "s" : ""} in your basket`}
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground mb-4">Your basket is empty</p>
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/#top">Make a Donation</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 pb-4 border-b last:border-0">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium">{item.appealTitle}</h3>
                    {item.productName && (
                      <p className="text-sm text-muted-foreground">{item.productName}</p>
                    )}
                    {item.waterProjectId && (
                      <p className="text-xs text-muted-foreground">Water for Life Project</p>
                    )}
                    {item.sponsorshipProjectId && (
                      <p className="text-xs text-muted-foreground">
                        Sponsorship{item.sponsorshipProjectType ? ` • ${formatEnum(item.sponsorshipProjectType)}` : ""}
                      </p>
                    )}
                    {item.plaqueName && (
                      <p className="text-xs text-muted-foreground">Plaque: {item.plaqueName}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{frequencyLabels[item.frequency]}</span>
                      <span>•</span>
                      <span>{formatEnum(item.donationType)}</span>
                    </div>
                    <p className="text-base font-semibold">{formatCurrency(item.amountPence)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8"
                  >
                    <IconX className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        {items.length > 0 && (
          <>
            <Separator />
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotalPence)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totalPence)}</span>
              </div>
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout" onClick={() => setOpen(false)}>
                  Proceed to Checkout
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
