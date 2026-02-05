"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { IconCalendarEvent } from "@tabler/icons-react"
import { formatCurrency, formatEnum, formatDateTime } from "@/lib/utils"
import { Building2, Target, Calendar, FileText, StickyNote, User, Pencil, Trash2 } from "lucide-react"

const COLLECTION_TYPE_STYLES: Record<string, string> = {
  JUMMAH: "bg-primary text-primary-foreground border-primary",
  RAMADAN: "bg-blue-500 text-white border-blue-500",
  EID: "bg-orange-500 text-white border-orange-500",
  SPECIAL: "bg-orange-500 text-white border-orange-500",
  OTHER: "bg-pink-500 text-white border-pink-500",
}

export type CollectionItem = {
  id: string
  amountPence: number
  donationType: string
  type: string
  collectedAt: Date | string
  masjidId?: string | null
  appealId?: string | null
  masjid?: { name: string } | null
  appeal?: { title: string } | null
  notes?: string | null
  addedByName?: string | null
}

type Props = {
  item: CollectionItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit?: boolean
  showLoggedBy?: boolean
  onEdit?: (item: CollectionItem) => void
  onDelete?: (item: CollectionItem) => void
}

export function CollectionDetailDialog({
  item,
  open,
  onOpenChange,
  canEdit = false,
  showLoggedBy = true,
  onEdit,
  onDelete,
}: Props) {
  if (!item) return null

  const collectedAt = typeof item.collectedAt === "string" ? new Date(item.collectedAt) : item.collectedAt

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Collection Details
              </DialogTitle>
              <DialogDescription>
                {formatCurrency(item.amountPence)} collected from {item.masjid?.name || "No masjid"}
              </DialogDescription>
            </div>
            {canEdit && onEdit && onDelete && (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                    <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-3 pt-0 relative z-10">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(item.amountPence)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                    <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-3 pt-0 relative z-10">
                      <Badge
                        variant="outline"
                        className={`px-1.5 ${COLLECTION_TYPE_STYLES[item.type] || ""}`}
                      >
                        <IconCalendarEvent className="mr-1 size-3" />
                        {formatEnum(item.type)}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <Separator className="my-6" />

                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                      Collection Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-0">
                      <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Masjid
                          </p>
                          <p className="text-base font-semibold text-foreground">
                            {item.masjid?.name || "No masjid"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                          <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Appeal
                          </p>
                          <p className="text-base text-foreground">
                            {item.appeal?.title || "General"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0">
                      <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Donation Type
                          </p>
                          <p className="text-base text-foreground">
                            {formatEnum(item.donationType)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Date Collected
                          </p>
                          <p className="text-base text-foreground">
                            {formatDateTime(collectedAt)}
                          </p>
                        </div>
                      </div>
                      {showLoggedBy && item.addedByName && (
                        <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Logged by
                            </p>
                            <p className="text-base text-foreground">{item.addedByName}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <StickyNote className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                          Notes
                        </h3>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <p className="text-base text-foreground">{item.notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
