"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

type AdminUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  createdAt: string
}

function AdminUserNameInputs({
  user,
  onSave,
}: {
  user: AdminUser
  onSave: (firstName: string, lastName: string) => void
}) {
  const [first, setFirst] = React.useState(user.firstName ?? "")
  const [last, setLast] = React.useState(user.lastName ?? "")
  React.useEffect(() => {
    setFirst(user.firstName ?? "")
    setLast(user.lastName ?? "")
  }, [user.id, user.firstName, user.lastName])
  const handleBlur = () => {
    const f = first.trim()
    const l = last.trim()
    if (f !== (user.firstName ?? "") || l !== (user.lastName ?? "")) {
      onSave(f || "", l || "")
    }
  }
  return (
    <div className="flex gap-2">
      <Input
        transform="titleCase"
        placeholder="First name"
        className="h-8 w-24"
        value={first}
        onChange={(e) => setFirst(e.target.value)}
        onBlur={handleBlur}
      />
      <Input
        transform="titleCase"
        placeholder="Last name"
        className="h-8 w-24"
        value={last}
        onChange={(e) => setLast(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  )
}

export function AdminUsersCard() {
  const [adminUsers, setAdminUsers] = React.useState<AdminUser[]>([])
  const [adminUsersLoading, setAdminUsersLoading] = React.useState(true)
  const [addAdminOpen, setAddAdminOpen] = React.useState(false)
  const [newAdminEmail, setNewAdminEmail] = React.useState("")
  const [newAdminRole, setNewAdminRole] = React.useState("VIEWER")
  const [addingAdmin, setAddingAdmin] = React.useState(false)

  const fetchAdminUsers = React.useCallback(() => {
    setAdminUsersLoading(true)
    fetch("/api/admin/settings/admin-users")
      .then((res) => res.json())
      .then((data) => setAdminUsers(Array.isArray(data) ? data : []))
      .catch(() => setAdminUsers([]))
      .finally(() => setAdminUsersLoading(false))
  }, [])

  React.useEffect(() => {
    fetchAdminUsers()
  }, [fetchAdminUsers])

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminEmail.trim()) return
    setAddingAdmin(true)
    try {
      const res = await fetch("/api/admin/settings/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail.trim(), role: newAdminRole }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to add")
      }
      setNewAdminEmail("")
      setNewAdminRole("VIEWER")
      setAddAdminOpen(false)
      fetchAdminUsers()
      toast.success("Invite sent to " + newAdminEmail.trim())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add admin user")
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleUpdateUser = async (
    id: string,
    updates: { role?: string; firstName?: string; lastName?: string }
  ) => {
    try {
      const res = await fetch(`/api/admin/settings/admin-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Failed to update")
      fetchAdminUsers()
      toast.success("Updated")
    } catch {
      toast.error("Failed to update")
    }
  }

  const handleRemoveAdmin = async (id: string) => {
    if (!confirm("Remove this admin user? They will no longer have access."))
      return
    try {
      const res = await fetch(`/api/admin/settings/admin-users/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove")
      fetchAdminUsers()
      toast.success("Admin user removed")
    } catch {
      toast.error("Failed to remove admin user")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Admin Users</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Manage who can access the admin panel.
            </p>
          </div>
          <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add admin</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add admin user</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newAdminEmail">Email</Label>
                  <Input
                    id="newAdminEmail"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAdminRole">Role</Label>
                  <Select
                    value={newAdminRole}
                    onValueChange={setNewAdminRole}
                  >
                    <SelectTrigger id="newAdminRole" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddAdminOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addingAdmin}>
                    {addingAdmin ? "Adding…" : "Add"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {adminUsersLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : adminUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No admin users. Add one to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <AdminUserNameInputs
                      user={user}
                      onSave={(firstName, lastName) =>
                        handleUpdateUser(user.id, {
                          firstName: firstName || "",
                          lastName: lastName || "",
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) =>
                        handleUpdateUser(user.id, { role })
                      }
                    >
                      <SelectTrigger size="sm" className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAdmin(user.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
