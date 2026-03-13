"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Users } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { formatAdminUserName } from "@/lib/utils"

export type StaffUser = { id: string; email: string; role: string; firstName?: string | null; lastName?: string | null }

export function StaffFilterSelect({
  staffUsers: staffUsersProp,
  paramName = "staff",
  label = "Filter by staff",
  className,
}: {
  staffUsers?: StaffUser[]
  paramName?: string
  label?: string
  className?: string
}) {
  const [fetchedUsers, setFetchedUsers] = React.useState<StaffUser[]>([])
  const staffUsers = staffUsersProp ?? fetchedUsers

  React.useEffect(() => {
    if (staffUsersProp) return
    fetch("/api/admin/staff-list")
      .then((r) => (r.ok ? r.json() : []))
      .then(setFetchedUsers)
      .catch(() => setFetchedUsers([]))
  }, [staffUsersProp])
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramName) || "all"

  const handleChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      next.delete(paramName)
    } else {
      next.set(paramName, value)
    }
    router.push(`?${next.toString()}`, { scroll: false })
  }

  const filterableUsers = staffUsers.filter(
    (u) => u.role === "STAFF" || u.role === "ADMIN"
  )

  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className={className}>
      {/* Mobile: icon button that opens popover */}
      {filterableUsers.length > 0 && (
        <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="flex h-9 w-9 shrink-0 sm:hidden"
              aria-label={label}
            >
              <Users className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1" align="end">
            <Button
              variant={current === "all" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                handleChange("all")
                setMobileOpen(false)
              }}
            >
              All staff
            </Button>
            {filterableUsers.map((user) => (
              <Button
                key={user.id}
                variant={current === user.id ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  handleChange(user.id)
                  setMobileOpen(false)
                }}
              >
                {formatAdminUserName(user) || user.email}
                {user.role !== "ADMIN" ? ` (${user.role})` : ""}
              </Button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {/* Desktop: full select with label */}
      {filterableUsers.length > 0 && (
        <div className="hidden sm:block">
          <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
          <Select value={current} onValueChange={handleChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All staff</SelectItem>
              {filterableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {formatAdminUserName(user) || user.email}
                  {user.role !== "ADMIN" ? ` (${user.role})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
