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
import { Separator } from "@/components/ui/separator"
import { formatAdminUserName, formatDate } from "@/lib/utils"
import { IconLoader2, IconPlus, IconPencil, IconTrash, IconCheck, IconList, IconSearch } from "@tabler/icons-react"
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
  priority: number | null
  dueDate: string | null
  staffNote: string | null
  createdAt: string
  updatedAt: string
  assigneeId: string
  assignee: { id: string; email: string; firstName: string | null; lastName: string | null }
  createdById: string | null
  createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null
}

type TaskNoteRow = {
  id: string
  content: string
  createdAt: string
  createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null
  createdByName: string | null
}

type TaskWithNotes = TaskRow & { notes: TaskNoteRow[] }

const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-500 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-amber-400 text-black",
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "Urgent",
  2: "Semi-urgent",
  3: "Normal",
}

function PriorityBadge({ priority }: { priority: number }) {
  const label = PRIORITY_LABELS[priority]
  return (
    <span
      className={`inline-flex w-fit items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[priority] ?? ""}`}
      title={label}
      aria-label={label}
    >
      {label}
    </span>
  )
}

const STATUS_OPTIONS = [
  { value: "TODO", label: "To-Do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
]

const TASKS_DATE_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
]

function getTasksDateRange(range: string | null): { dueFrom: string; dueTo: string } | null {
  if (!range || range === "all") return null
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (range) {
    case "7d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      break
    case "30d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case "90d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    default:
      return null
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { dueFrom: fmt(startDate), dueTo: fmt(endDate) }
}

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
  const [filterSearch, setFilterSearch] = React.useState("")
  const [filterDateRange, setFilterDateRange] = React.useState("all")
  const filterSearchRef = React.useRef(filterSearch)
  const filterDateRangeRef = React.useRef(filterDateRange)
  filterSearchRef.current = filterSearch
  filterDateRangeRef.current = filterDateRange
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null)
  const [viewTask, setViewTask] = React.useState<TaskRow | null>(null)
  const [viewTaskDetails, setViewTaskDetails] = React.useState<TaskWithNotes | null>(null)
  const [noteSubmitting, setNoteSubmitting] = React.useState(false)
  const [newNoteContent, setNewNoteContent] = React.useState("")
  const [deleteConfirm, setDeleteConfirm] = React.useState<TaskRow | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [formTitle, setFormTitle] = React.useState("")
  const [formDescription, setFormDescription] = React.useState("")
  const [formAssigneeId, setFormAssigneeId] = React.useState("")
  const [formDueDate, setFormDueDate] = React.useState("")
  const [formPriority, setFormPriority] = React.useState("3")
  const [formStatus, setFormStatus] = React.useState("TODO")
  const [formStaffNote, setFormStaffNote] = React.useState("")

  const isAdmin = role === "ADMIN"

  const fetchTasks = React.useCallback(
    async (overrides?: { search?: string; dueFrom?: string; dueTo?: string; dateRange?: string }) => {
      setLoading(true)
      try {
        const search = overrides?.search ?? filterSearchRef.current
        let dueFrom = overrides?.dueFrom
        let dueTo = overrides?.dueTo
        if (overrides?.dateRange !== undefined) {
          const range = getTasksDateRange(overrides.dateRange)
          if (range) {
            dueFrom = range.dueFrom
            dueTo = range.dueTo
          } else {
            dueFrom = ""
            dueTo = ""
          }
        } else if (dueFrom === undefined && dueTo === undefined) {
          const range = getTasksDateRange(filterDateRangeRef.current)
          if (range) {
            dueFrom = range.dueFrom
            dueTo = range.dueTo
          } else {
            dueFrom = ""
            dueTo = ""
          }
        }
        const params = new URLSearchParams()
        params.set("view", viewTab)
        if (isAdmin && filterAssignee !== "all") params.set("assigneeId", filterAssignee)
        if (viewTab === "active" && filterStatus !== "all") params.set("status", filterStatus)
        if (search.trim()) params.set("search", search.trim())
        if (dueFrom) params.set("dueFrom", dueFrom)
        if (dueTo) params.set("dueTo", dueTo)
        const res = await fetch(`/api/admin/tasks?${params}`)
        if (!res.ok) throw new Error("Failed to load tasks")
        const data = (await res.json()) as TaskRow[]
        setTasks(data)
      } catch {
        toast.error("Failed to load tasks")
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, viewTab, filterAssignee, filterStatus]
  )

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

  React.useEffect(() => {
    if (!viewTask) {
      setViewTaskDetails(null)
      setNewNoteContent("")
      return
    }
    setViewTaskDetails(null)
    const taskId = viewTask.id
    let cancelled = false
    fetch(`/api/admin/tasks/${taskId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TaskWithNotes | null) => {
        if (!cancelled && data && data.id === taskId) setViewTaskDetails(data)
      })
      .catch(() => {
        if (!cancelled) setViewTaskDetails(null)
      })
    return () => {
      cancelled = true
    }
  }, [viewTask?.id])

  const addNote = React.useCallback(async () => {
    if (!viewTask || !newNoteContent.trim()) return
    setNoteSubmitting(true)
    try {
      const res = await fetch(`/api/admin/tasks/${viewTask.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNoteContent.trim() }),
      })
      if (!res.ok) throw new Error("Failed to add note")
      const note = await res.json() as { id: string; content: string; createdAt: string; createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null }
      setViewTaskDetails((prev) =>
        prev
          ? {
              ...prev,
              notes: [
                {
                  id: note.id,
                  content: note.content,
                  createdAt: note.createdAt,
                  createdBy: note.createdBy,
                  createdByName: note.createdBy ? formatAdminUserName(note.createdBy) : null,
                },
                ...prev.notes,
              ],
            }
          : null
      )
      setNewNoteContent("")
      toast.success("Note added")
    } catch {
      toast.error("Failed to add note")
    } finally {
      setNoteSubmitting(false)
    }
  }, [viewTask, newNoteContent])

  const openNewModal = React.useCallback(() => {
    setEditingTask(null)
    setFormTitle("")
    setFormDescription("")
    setFormAssigneeId(isAdmin ? (staff[0]?.id ?? "") : (currentUserId ?? ""))
    setFormDueDate("")
    setFormPriority("3")
    setFormStatus("TODO")
    setModalOpen(true)
  }, [isAdmin, staff, currentUserId])

  const openEditModal = React.useCallback((task: TaskRow) => {
    setEditingTask(task)
    setFormTitle(task.title)
    setFormDescription(task.description ?? "")
    setFormAssigneeId(task.assigneeId)
    setFormDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "")
    setFormPriority(task.priority != null ? String(task.priority) : "3")
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
              priority: formPriority ? Number(formPriority) : null,
              status: formStatus,
            }
          : { status: formStatus, staffNote: formStaffNote.trim() || null }
        const res = await fetch(`/api/admin/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          const msg = typeof errBody?.error === "string" ? errBody.error : Array.isArray(errBody?.error) ? errBody.error.map((e: { message?: string }) => e.message).filter(Boolean).join(", ") : "Failed to update task"
          throw new Error(msg || "Failed to update task")
        }
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
            priority: formPriority ? Number(formPriority) : null,
          }),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          const msg = typeof errBody?.error === "string" ? errBody.error : Array.isArray(errBody?.error) ? errBody.error.map((e: { message?: string }) => e.message).filter(Boolean).join(", ") : "Failed to create task"
          throw new Error(msg || "Failed to create task")
        }
        toast.success("Task created")
      }
      setModalOpen(false)
      fetchTasks()
    } catch (e) {
      const message = e instanceof Error ? e.message : editingTask ? "Failed to update task" : "Failed to create task"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }, [editingTask, isAdmin, formTitle, formDescription, formAssigneeId, formDueDate, formPriority, formStatus, formStaffNote, fetchTasks])

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
          <div className="relative w-full sm:min-w-[280px] sm:w-[280px]">
            <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search title or description…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchTasks()}
              className="pl-8"
            />
          </div>
          <Select
            value={filterDateRange}
            onValueChange={(value) => {
              setFilterDateRange(value)
              fetchTasks({ dateRange: value })
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {TASKS_DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterSearch || filterDateRange !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterSearch("")
                setFilterDateRange("all")
                fetchTasks({ search: "", dateRange: "all" })
              }}
            >
              Clear
            </Button>
          )}
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
              <SelectTrigger className="min-w-[200px] w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (To-Do & In progress)</SelectItem>
                <SelectItem value="TODO">To-Do</SelectItem>
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
                      <TableHead>Priority</TableHead>
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
                        onClick={() => setViewTask(task)}
                      >
                        <TableCell>
                          {task.priority != null ? (
                            <PriorityBadge priority={task.priority} />
                          ) : (
                            "—"
                          )}
                        </TableCell>
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
                              onClick={(e) => {
                                e.stopPropagation()
                                setViewTask(null)
                                openEditModal(task)
                              }}
                            >
                              <IconPencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            {(isAdmin || task.createdById === currentUserId) && (
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
        <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto">
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
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {([1, 2, 3] as const).map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={formPriority === String(p) ? "default" : "outline"}
                        size="sm"
                        className={`h-8 px-3 font-semibold ${formPriority === String(p) ? PRIORITY_COLORS[p] : ""}`}
                        onClick={() => setFormPriority(String(p))}
                      >
                        {PRIORITY_LABELS[p]}
                      </Button>
                    ))}
                  </div>
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
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {([1, 2, 3] as const).map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={formPriority === String(p) ? "default" : "outline"}
                        size="sm"
                        className={`h-8 px-3 font-semibold ${formPriority === String(p) ? PRIORITY_COLORS[p] : ""}`}
                        onClick={() => setFormPriority(String(p))}
                      >
                        {PRIORITY_LABELS[p]}
                      </Button>
                    ))}
                  </div>
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

      <Dialog open={!!viewTask} onOpenChange={(open) => !open && setViewTask(null)}>
        <DialogContent className="p-6 max-w-4xl max-h-[85vh] overflow-y-auto" hideCloseButton>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle>Task details</DialogTitle>
                <DialogDescription>
                  {viewTask?.title}
                </DialogDescription>
              </div>
              {viewTask && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => {
                      setViewTask(null)
                      openEditModal(viewTask)
                      setModalOpen(true)
                    }}
                  >
                    <IconPencil className="size-4 mr-1" />
                    Edit
                  </Button>
                  {(isAdmin || viewTask.createdById === currentUserId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setViewTask(null)
                        setDeleteConfirm(viewTask)
                      }}
                    >
                      <IconTrash className="size-4 mr-1" />
                      Delete
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setViewTask(null)}>
                    Close
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {viewTask && (() => {
            const displayTask = viewTaskDetails ?? viewTask
            const notes = viewTaskDetails?.notes ?? []
            return (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Title
                  </p>
                  <p className="text-sm font-medium">{displayTask.title}</p>
                </div>
                {displayTask.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Description
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{displayTask.description}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Priority
                    </p>
                    {displayTask.priority != null ? (
                      <PriorityBadge priority={displayTask.priority} />
                    ) : (
                      <p className="text-sm font-medium">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <Select
                      value={displayTask.status}
                      onValueChange={async (value) => {
                        if (!viewTask || value === displayTask.status) return
                        try {
                          const res = await fetch(`/api/admin/tasks/${viewTask.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: value }),
                          })
                          if (!res.ok) throw new Error("Failed to update status")
                          setViewTaskDetails((prev) => (prev ? { ...prev, status: value } : null))
                          setViewTask((prev) => (prev ? { ...prev, status: value } : null))
                          setTasks((prev) => prev.map((t) => (t.id === viewTask.id ? { ...t, status: value } : t)))
                          toast.success("Status updated")
                        } catch {
                          toast.error("Failed to update status")
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:max-w-[180px]">
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Due date
                    </p>
                    <p className="text-sm font-medium">{displayTask.dueDate ? formatDate(displayTask.dueDate) : "—"}</p>
                  </div>
                  {isAdmin && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Assignee
                      </p>
                      <p className="text-sm font-medium">{formatAdminUserName(displayTask.assignee) || displayTask.assignee.email}</p>
                    </div>
                  )}
                </div>

                {displayTask.staffNote && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Status note
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{displayTask.staffNote}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Notes
                  </p>
                  <div className="space-y-3 mb-4">
                    <Textarea
                      placeholder="Add a note for record keeping…"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      size="sm"
                      onClick={addNote}
                      disabled={!newNoteContent.trim() || noteSubmitting}
                    >
                      {noteSubmitting && <IconLoader2 className="size-4 animate-spin mr-2" />}
                      Add note
                    </Button>
                  </div>
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {notes.map((note) => (
                        <li
                          key={note.id}
                          className="rounded-md border bg-muted/30 p-3 text-sm"
                        >
                          <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(note.createdAt)}
                            {note.createdByName && ` · ${note.createdByName}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-muted-foreground">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Created
                    </p>
                    <p className="text-sm font-medium text-foreground">{formatDate(displayTask.createdAt)}</p>
                    {displayTask.createdBy && (
                      <p className="text-xs">by {formatAdminUserName(displayTask.createdBy) || displayTask.createdBy.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Updated
                    </p>
                    <p className="text-sm font-medium text-foreground">{formatDate(displayTask.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )
          })()}
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
