"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatAdminUserName, formatDate } from "@/lib/utils"
import { IconLoader2, IconPlus, IconPencil, IconTrash, IconCheck, IconList } from "@tabler/icons-react"
import { toast } from "sonner"

type StaffUser = {
  id: string
  email: string
  role: string
  firstName: string | null
  lastName: string | null
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string
  dueDate: string | null
  staffNote: string | null
  createdAt: string
  updatedAt: string
  assigneeId: string
  assignee: { id: string; email: string; firstName: string | null; lastName: string | null }
  createdById: string | null
  createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null
}

const STATUS_OPTIONS = [
  { value: "TODO", label: "Todo" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
]

function formatStatus(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
}

function capitalizeEachWord(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function capitalizeFirstWord(s: string) {
  if (s.length === 0) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function TasksPageClient() {
  const [role, setRole] = React.useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [tasks, setTasks] = React.useState<TaskRow[]>([])
  const [staff, setStaff] = React.useState<StaffUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewTab, setViewTab] = React.useState<"active" | "completed">("active")
  const [filterAssignee, setFilterAssignee] = React.useState<string>("all")
  const [filterStatus, setFilterStatus] = React.useState<string>("all")
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = React.useState<TaskRow | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [formTitle, setFormTitle] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")
  const [formAssigneeId, setFormAssigneeId] = React.useState("")
  const [formDueDate, setFormDueDate] = React.useState("")
  const [formStatus, setFormStatus] = React.useState("TODO")
  const [formStaffNote, setFormStaffNote] = React.useState("")

  const isAdmin = role === "ADMIN"

  const fetchTasks = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("view", viewTab)
      if (isAdmin && filterAssignee !== "all") params.set("assigneeId", filterAssignee)
      if (viewTab === "active" && filterStatus !== "all") params.set("status", filterStatus)
      const res = await fetch(`/api/admin/tasks?${params}`)
      if (!res.ok) throw new Error("Failed to load tasks")
      const data = (await res.json()) as TaskRow[]
      setTasks(data)
    } catch {
      toast.error("Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }, [isAdmin, viewTab, filterAssignee, filterStatus])

  const fetchStaff = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff-list")
      if (!res.ok) throw new Error("Failed to load staff")
      const data = (await res.json()) as StaffUser[]
      setStaff(data)
    } catch {
      toast.error("Failed to load staff")
    }
  }, [])

  React.useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setRole(data?.role ?? null)
        setCurrentUserId(data?.id ?? null)
      })
      .catch(() => {
        setRole(null)
        setCurrentUserId(null)
      })
  }, [])

  React.useEffect(() => {
    if (role) fetchTasks()
  }, [role, fetchTasks])

  React.useEffect(() => {
    if (role === "ADMIN") fetchStaff()
  }, [role, fetchStaff])

  const openNewModal = React.useCallback(() => {
    setEditingTask(null)
    setFormTitle("")
    setFormDescription("")
    setFormAssigneeId(isAdmin ? (staff[0]?.id ?? "") : (currentUserId ?? ""))
    setFormDueDate("")
    setFormStatus("TODO")
    setModalOpen(true)
  }, [isAdmin, staff, currentUserId])

  const openEditModal = React.useCallback((task: TaskRow) => {
    setEditingTask(task)
    setFormTitle(task.title)
    setFormDescription(task.description ?? "")
    setFormAssigneeId(task.assigneeId)
    setFormDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "")
    setFormStatus(task.status)
    setFormStaffNote(task.staffNote ?? "")
    setModalOpen(true)
  }, [])

  const handleSubmit = React.useCallback(async () => {
    if (!editingTask) {
      if (!formTitle.trim()) {
        toast.error("Title is required")
        return
      }
      if (isAdmin && !formAssigneeId) {
        toast.error("Please select an assignee")
        return
      }
    }
    setSubmitting(true)
    try {
      if (editingTask) {
        const body = isAdmin
          ? {
              title: formTitle.trim(),
              description: formDescription.trim() || null,
              assigneeId: formAssigneeId,
              dueDate: formDueDate ? new Date(formDueDate).toISOString() : null,
              status: formStatus,
            }
          : { status: formStatus, staffNote: formStaffNote.trim() || null }
        const res = await fetch(`/api/admin/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed to update task")
        toast.success("Task updated")
      } else {
        const res = await fetch("/api/admin/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            ...(isAdmin ? { assigneeId: formAssigneeId } : {}),
            dueDate: formDueDate ? new Date(formDueDate).toISOString() : null,
          }),
        })
        if (!res.ok) throw new Error("Failed to create task")
        toast.success("Task created")
      }
      setModalOpen(false)
      fetchTasks()
    } catch {
      toast.error(editingTask ? "Failed to update task" : "Failed to create task")
    } finally {
      setSubmitting(false)
    }
  }, [editingTask, isAdmin, formTitle, formDescription, formAssigneeId, formDueDate, formStatus, formStaffNote, fetchTasks])

  const handleDelete = React.useCallback(async () => {
    if (!deleteConfirm) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/tasks/${deleteConfirm.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete task")
      toast.success("Task deleted")
      setDeleteConfirm(null)
      fetchTasks()
    } catch {
      toast.error("Failed to delete task")
    } finally {
      setSubmitting(false)
    }
  }, [deleteConfirm, fetchTasks])

  if (role === null || (loading && tasks.length === 0)) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "Create and assign tasks to staff, admins, or yourself. Filter by assignee or status."
              : "View and manage your tasks. Add tasks for yourself or update status and notes."}
          </p>
        </div>
        <Button
          onClick={openNewModal}
          disabled={isAdmin && staff.length === 0}
        >
          <IconPlus className="size-4 mr-2" />
          New task
        </Button>
      </div>

      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "active" | "completed")}>
        <TabsList className="w-fit">
          <TabsTrigger value="active" className="gap-1.5">
            <IconList className="size-4" />
            Active
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <IconCheck className="size-4" />
            Completed
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-2 pt-4">
          {isAdmin && (
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {staff.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {formatAdminUserName(u) || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {viewTab === "active" && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Todo & In progress)</SelectItem>
                <SelectItem value="TODO">Todo</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="mt-4">
          <Card className="py-0">
            <CardContent className="p-0">
              {tasks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {viewTab === "active"
                    ? isAdmin
                      ? "No active tasks. Create one to get started."
                      : "No active tasks assigned to you."
                    : "No completed tasks yet. Completed tasks will appear here."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      {isAdmin && <TableHead>Assignee</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead>Due date</TableHead>
                      {viewTab === "completed" ? (
                        <TableHead>Completed</TableHead>
                      ) : (
                        <TableHead>Created</TableHead>
                      )}
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEditModal(task)}
                      >
                        <TableCell className="font-medium">{task.title}</TableCell>
                        {isAdmin && (
                          <TableCell>{formatAdminUserName(task.assignee) || task.assignee.email}</TableCell>
                        )}
                        <TableCell>{formatStatus(task.status)}</TableCell>
                        <TableCell>{task.dueDate ? formatDate(task.dueDate) : "—"}</TableCell>
                        {viewTab === "completed" ? (
                          <TableCell>{formatDate(task.updatedAt)}</TableCell>
                        ) : (
                          <TableCell>{formatDate(task.createdAt)}</TableCell>
                        )}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditModal(task)}
                            >
                              <IconPencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirm(task)}
                              >
                                <IconTrash className="size-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Tabs>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>
              {editingTask
                ? isAdmin
                  ? "Update the task details below."
                  : "Update status and add a note."
                : isAdmin
                  ? "Assign a task to a staff member, admin, or yourself. They will see it in Tasks."
                  : "Add a task for yourself to manage your workload."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isAdmin ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(capitalizeEachWord(e.target.value))}
                    placeholder="Task title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-description">Description (optional)</Label>
                  <Textarea
                    id="task-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(capitalizeFirstWord(e.target.value))}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Assignee</Label>
                  <Select value={formAssigneeId} onValueChange={setFormAssigneeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {formatAdminUserName(u) || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingTask && (
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={formStatus} onValueChange={setFormStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="task-due">Due date (optional)</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </>
            ) : editingTask ? (
              <>
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <p className="text-sm py-1.5">{formTitle}</p>
                </div>
                {formDescription && (
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <p className="text-sm py-1.5 whitespace-pre-wrap">{formDescription}</p>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-staff-note">Note (optional)</Label>
                  <Textarea
                    id="task-staff-note"
                    value={formStaffNote}
                    onChange={(e) => setFormStaffNote(e.target.value)}
                    placeholder="Add a note when updating status"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(capitalizeEachWord(e.target.value))}
                    placeholder="Task title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-description">Description (optional)</Label>
                  <Textarea
                    id="task-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(capitalizeFirstWord(e.target.value))}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="task-due">Due date (optional)</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <IconLoader2 className="size-4 animate-spin mr-2" />}
              {editingTask ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <IconLoader2 className="size-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
