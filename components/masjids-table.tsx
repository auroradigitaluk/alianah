"use client"

import { useMemo, useState, useEffect } from "react"
import { AdminTable, StatusBadge } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, formatEnum } from "@/lib/utils"
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
import { Building2, User, Phone, Mail, MapPin, Calendar } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CollectionDetailDialog, type CollectionItem } from "@/components/collection-detail-dialog"

export interface MasjidCollection {
  id: string
  amountPence: number
  donationType: string
  type: string
  collectedAt: string
  masjidId?: string | null
  appealId?: string | null
  masjid?: { name: string } | null
  appeal?: { title: string } | null
  notes?: string | null
  addedByName?: string | null
}

interface Masjid {
  id: string
  name: string
  status: string
  city: string
  address: string
  postcode?: string | null
  country?: string | null
  region?: string | null
  contactName?: string | null
  contactRole?: string | null
  phone?: string | null
  phoneAlt?: string | null
  email?: string | null
  emailAlt?: string | null
  secondaryContactName?: string | null
  secondaryContactRole?: string | null
  website?: string | null
  preferredContactMethod?: string | null
  lastContactedAt?: string | null
  nextFollowUpAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  addedByName?: string | null
  collectionCount: number
  totalAmountRaised: number
  collections?: MasjidCollection[]
}

export function MasjidsTable({
  masjids,
  initialSelectedId,
}: {
  masjids: Masjid[]
  initialSelectedId?: string | null
}) {
  const [selectedMasjid, setSelectedMasjid] = useState<Masjid | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null)
  const [collectionDetailOpen, setCollectionDetailOpen] = useState(false)
  const [nameQuery, setNameQuery] = useState("")
  const [cityQuery, setCityQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    if (initialSelectedId) {
      const masjid = masjids.find((m) => m.id === initialSelectedId) ?? null
      setSelectedMasjid(masjid)
    }
  }, [initialSelectedId, masjids])

  const filteredMasjids = useMemo(() => {
    const normalizedName = nameQuery.trim().toLowerCase()
    const normalizedCity = cityQuery.trim().toLowerCase()

    return masjids.filter((masjid) => {
      const matchesName = normalizedName
        ? masjid.name.toLowerCase().includes(normalizedName)
        : true
      const matchesCity = normalizedCity
        ? masjid.city.toLowerCase().includes(normalizedCity)
        : true
      const matchesStatus =
        statusFilter === "all" ? true : masjid.status === statusFilter

      return matchesName && matchesCity && matchesStatus
    })
  }, [cityQuery, masjids, nameQuery, statusFilter])

  const clearFilters = () => {
    setNameQuery("")
    setCityQuery("")
    setStatusFilter("all")
  }

  const getMasjidStatusBadge = (status: string) => {
    if (status === "ACTIVE") {
      return <StatusBadge isActive />
    }
    if (status === "INACTIVE") {
      return (
        <Badge variant="outline" className="px-1.5 text-muted-foreground bg-muted">
          {formatEnum(status)}
        </Badge>
      )
    }
    if (status === "PROSPECT") {
      return (
        <Badge variant="outline" className="px-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
          {formatEnum(status)}
        </Badge>
      )
    }
    if (status === "ON_HOLD") {
      return (
        <Badge variant="outline" className="px-1.5 bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">
          {formatEnum(status)}
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="px-1.5 text-muted-foreground bg-muted">
        {formatEnum(status)}
      </Badge>
    )
  }

  return (
    <>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="masjids-name">Masjid name</Label>
            <Input
              id="masjids-name"
              transform="titleCase"
              placeholder="Search masjid"
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="masjids-city">City</Label>
            <Input
              id="masjids-city"
              transform="titleCase"
              placeholder="Filter by city"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="masjids-status">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="masjids-status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="ON_HOLD">On hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>
      <AdminTable
        data={filteredMasjids}
        onRowClick={(masjid) => setSelectedMasjid(masjid)}
        columns={[
        {
          id: "name",
          header: "Masjid Name",
          cell: (masjid) => (
            <div className="font-medium">{masjid.name}</div>
          ),
        },
        {
          id: "status",
          header: "Status",
          cell: (masjid) => getMasjidStatusBadge(masjid.status),
        },
        {
          id: "contactName",
          header: "Contact Name",
          cell: (masjid) => (
            <div className="text-sm">{masjid.contactName || "-"}</div>
          ),
        },
        {
          id: "phone",
          header: "Phone Number",
          cell: (masjid) => (
            <div className="text-sm">{masjid.phone || "-"}</div>
          ),
        },
        {
          id: "city",
          header: "City",
          cell: (masjid) => <div className="text-sm">{masjid.city}</div>,
        },
        {
          id: "collectionCount",
          header: "No of Collections",
          cell: (masjid) => (
            <div className="text-sm">{masjid.collectionCount}</div>
          ),
        },
        {
          id: "totalAmountRaised",
          header: "Amount Raised",
          cell: (masjid) => (
            <div className="font-medium">{formatCurrency(masjid.totalAmountRaised)}</div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <Dialog
        open={!!selectedMasjid}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMasjid(null)
            setSelectedCollection(null)
            setCollectionDetailOpen(false)
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">
              {selectedMasjid?.name || "Masjid Details"}
            </DialogTitle>
            <DialogDescription>
              Masjid information and collection statistics
            </DialogDescription>
          </DialogHeader>

          {selectedMasjid && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {selectedMasjid.collections && selectedMasjid.collections.length > 0 && (
                      <TabsTrigger value="collections">
                        Collections ({selectedMasjid.collections.length})
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <TabsContent value="overview" className="space-y-6 mt-0">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Raised
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(selectedMasjid.totalAmountRaised)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="py-2 gap-1 relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
                        <CardHeader className="pb-0 px-6 pt-3 relative z-10">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Collections
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-3 pt-0 relative z-10">
                          <div className="text-2xl font-bold">
                            {selectedMasjid.collectionCount}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator className="my-6" />

                    {/* Masjid Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">Masjid Information</h3>
                      </div>

                      <div className="flex items-start gap-4 py-3 px-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Added by
                          </p>
                          <p className="text-base text-foreground">
                            {selectedMasjid.addedByName ?? "—"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Masjid Name
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedMasjid.name}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Contact Name
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.contactName || "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Contact Role
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.contactRole || "-"}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Phone Number
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.phone || "-"}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Preferred Contact
                              </p>
                              <p className="text-base text-foreground">
                                {selectedMasjid.preferredContactMethod
                                  ? formatEnum(selectedMasjid.preferredContactMethod)
                                  : "-"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Email
                              </p>
                              <p className="text-base text-foreground break-all">{selectedMasjid.email || "-"}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Status
                              </p>
                              {getMasjidStatusBadge(selectedMasjid.status)}
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                City
                              </p>
                              <p className="text-base font-semibold text-foreground">{selectedMasjid.city}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Address
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.address}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Postcode / Country
                              </p>
                              <p className="text-base text-foreground">
                                {[selectedMasjid.postcode, selectedMasjid.country, selectedMasjid.region]
                                  .filter(Boolean)
                                  .join(", ") || "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Website
                              </p>
                              <p className="text-base text-foreground break-all">
                                {selectedMasjid.website || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                          Secondary Contact
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Contact Name
                              </p>
                              <p className="text-base text-foreground">
                                {selectedMasjid.secondaryContactName || "-"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Contact Role
                              </p>
                              <p className="text-base text-foreground">
                                {selectedMasjid.secondaryContactRole || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Secondary Phone
                              </p>
                              <p className="text-base text-foreground">{selectedMasjid.phoneAlt || "-"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Secondary Email
                              </p>
                              <p className="text-base text-foreground break-all">
                                {selectedMasjid.emailAlt || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-2">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
                          Relationship Tracking
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Last Contacted
                              </p>
                              <p className="text-base text-foreground">
                                {formatDate(selectedMasjid.lastContactedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Next Follow-up
                              </p>
                              <p className="text-base text-foreground">
                                {formatDate(selectedMasjid.nextFollowUpAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-0">
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Created
                              </p>
                              <p className="text-base text-foreground">
                                {formatDate(selectedMasjid.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 py-4 px-4 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Last Updated
                              </p>
                              <p className="text-base text-foreground">
                                {formatDate(selectedMasjid.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Notes
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {selectedMasjid.notes || "-"}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="pt-2">
                      <a
                        href={`/admin/masjids/${selectedMasjid.id}/edit`}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit Masjid →
                      </a>
                    </div>
                  </TabsContent>

                  {selectedMasjid.collections && selectedMasjid.collections.length > 0 && (
                    <TabsContent value="collections" className="mt-0">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Logged by</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedMasjid.collections.map((collection) => (
                              <TableRow
                                key={collection.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => {
                                  setSelectedCollection(collection as CollectionItem)
                                  setCollectionDetailOpen(true)
                                }}
                              >
                                <TableCell className="font-medium">
                                  {collection.addedByName || "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {formatDate(new Date(collection.collectedAt))}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(collection.amountPence)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CollectionDetailDialog
        item={selectedCollection}
        open={collectionDetailOpen}
        onOpenChange={setCollectionDetailOpen}
        showLoggedBy={true}
      />
    </>
  )
}
