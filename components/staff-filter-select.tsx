"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  if (filterableUsers.length === 0) {
    return null
  }

  return (
    <div className={className}>
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
  )
}
