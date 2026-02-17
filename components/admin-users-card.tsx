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
import { IconCircleCheckFilled, IconClock } from "@tabler/icons-react"
import { formatDateTime } from "@/lib/utils"

type AdminUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  createdAt: string
  hasSetPassword: boolean
}

type AdminUserDetails = AdminUser & {
  lastLoginAt: string | null
}

function formatRole(role: string): string {
  const map: Record<string, string> = { ADMIN: "Admin", STAFF: "Staff", VIEWER: "Viewer" }
  return map[role] ?? role
}

export function AdminUsersCard() {
  const [adminUsers, setAdminUsers] = React.useState<AdminUser[]>([])
  const [adminUsersLoading, setAdminUsersLoading] = React.useState(true)
  const [addAdminOpen, setAddAdminOpen] = React.useState(false)
  const [newAdminEmail, setNewAdminEmail] = React.useState("")
  const [newAdminFirstName, setNewAdminFirstName] = React.useState("")
  const [newAdminLastName, setNewAdminLastName] = React.useState("")
  const [newAdminRole, setNewAdminRole] = React.useState("VIEWER")
  const [addingAdmin, setAddingAdmin] = React.useState(false)

  const [viewModalOpen, setViewModalOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null)
  const [modalDetails, setModalDetails] = React.useState<AdminUserDetails | null>(null)
  const [modalDetailsLoading, setModalDetailsLoading] = React.useState(false)
  const [modalDetailsError, setModalDetailsError] = React.useState<string | null>(null)
  const [isEditingInModal, setIsEditingInModal] = React.useState(false)
  const [editFirstName, setEditFirstName] = React.useState("")
  const [editLastName, setEditLastName] = React.useState("")
  const [editRole, setEditRole] = React.useState("VIEWER")
  const [savingEdit, setSavingEdit] = React.useState(false)

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

  const fetchModalDetails = React.useCallback((id: string) => {
    setModalDetailsLoading(true)
    setModalDetailsError(null)
    fetch(`/api/admin/settings/admin-users/${id}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setModalDetails(data)
          setModalDetailsError(null)
        } else {
          setModalDetails(null)
          setModalDetailsError((data?.error as string) || "Could not load user details.")
        }
      })
      .catch(() => {
        setModalDetails(null)
        setModalDetailsError("Could not load user details.")
      })
      .finally(() => setModalDetailsLoading(false))
  }, [])

  React.useEffect(() => {
    if (!viewModalOpen || !selectedUser) return
    fetchModalDetails(selectedUser.id)
  }, [viewModalOpen, selectedUser?.id])

  const openViewModal = (user: AdminUser) => {
    setSelectedUser(user)
    setViewModalOpen(true)
    setIsEditingInModal(false)
  }

  const closeViewModal = () => {
    setViewModalOpen(false)
    setSelectedUser(null)
    setModalDetails(null)
    setModalDetailsError(null)
  }

  const startEditInModal = () => {
    if (!selectedUser) return
    setEditFirstName(selectedUser.firstName ?? "")
    setEditLastName(selectedUser.lastName ?? "")
    setEditRole(selectedUser.role)
    setIsEditingInModal(true)
  }

  const cancelEditInModal = () => {
    setIsEditingInModal(false)
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminEmail.trim()) return
    setAddingAdmin(true)
    try {
      const res = await fetch("/api/admin/settings/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAdminEmail.trim(),
          role: newAdminRole,
          firstName: newAdminFirstName.trim() || null,
          lastName: newAdminLastName.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to add")
      }
      setNewAdminEmail("")
      setNewAdminFirstName("")
      setNewAdminLastName("")
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
  ): Promise<void> => {
    try {
      const res = await fetch(`/api/admin/settings/admin-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Failed to update")
      fetchAdminUsers()
      setIsEditingInModal(false)
      toast.success("Updated")
      fetchModalDetails(id)
    } catch {
      toast.error("Failed to update")
    } finally {
      setSavingEdit(false)
    }
  }

  const handleSaveEditInModal = async () => {
    if (!selectedUser) return
    setSavingEdit(true)
    await handleUpdateUser(selectedUser.id, {
      firstName: editFirstName.trim() || "",
      lastName: editLastName.trim() || "",
      role: editRole,
    })
  }

  const handleRemoveAdmin = async (id: string) => {
    if (!confirm("Remove this admin user? They will no longer have access.")) return
    try {
      const res = await fetch(`/api/admin/settings/admin-users/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove")
      closeViewModal()
      fetchAdminUsers()
      toast.success("Admin user removed")
    } catch {
      toast.error("Failed to remove admin user")
    }
  }

  const displayName = (u: AdminUser) => {
    const first = (u.firstName ?? "").trim()
    const last = (u.lastName ?? "").trim()
    if (first || last) return `${first} ${last}`.trim()
    return "—"
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newAdminFirstName">First name</Label>
                    <Input
                      id="newAdminFirstName"
                      transform="titleCase"
                      value={newAdminFirstName}
                      onChange={(e) => setNewAdminFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newAdminLastName">Last name</Label>
                    <Input
                      id="newAdminLastName"
                      transform="titleCase"
                      value={newAdminLastName}
                      onChange={(e) => setNewAdminLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openViewModal(user)}
                >
                  <TableCell className="font-medium">{displayName(user)}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{formatRole(user.role)}</TableCell>
                  <TableCell>
                    {user.hasSetPassword ? (
                      <span
                        className="inline-flex text-primary"
                        title="Password set"
                      >
                        <IconCircleCheckFilled className="size-4 shrink-0" aria-hidden />
                      </span>
                    ) : (
                      <span
                        className="inline-flex text-amber-600 dark:text-amber-500"
                        title="Pending invite"
                      >
                        <IconClock className="size-4 shrink-0" aria-hidden />
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* View / Edit user modal */}
      <Dialog open={viewModalOpen} onOpenChange={(open) => !open && closeViewModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? displayName(selectedUser) || selectedUser.email : "User"}
            </DialogTitle>
          </DialogHeader>

          {!selectedUser ? null : isEditingInModal ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first-name">First name</Label>
                  <Input
                    id="edit-first-name"
                    transform="titleCase"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-name">Last name</Label>
                  <Input
                    id="edit-last-name"
                    transform="titleCase"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger id="edit-role" className="w-full">
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
                <Button variant="outline" onClick={cancelEditInModal} disabled={savingEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditInModal} disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {modalDetailsLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : modalDetails ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span>{modalDetails.email}</span>
                    <span className="text-muted-foreground">Role</span>
                    <span>{formatRole(modalDetails.role)}</span>
                    <span className="text-muted-foreground">Setup</span>
                    <span>
                      {modalDetails.hasSetPassword ? "Password set" : "Pending invite"}
                    </span>
                    <span className="text-muted-foreground">Last login</span>
                    <span>
                      {modalDetails.lastLoginAt
                        ? formatDateTime(modalDetails.lastLoginAt)
                        : "—"}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {modalDetailsError || "Could not load user details."}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={startEditInModal}>
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedUser && handleRemoveAdmin(selectedUser.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
