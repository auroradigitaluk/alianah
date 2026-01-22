"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"

interface DetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

export function DetailModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DetailModalProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-xl font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-muted-foreground mt-1">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <Card className="p-6">
            {children}
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
