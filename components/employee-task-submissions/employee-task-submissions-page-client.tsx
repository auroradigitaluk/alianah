"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { IconLoader2, IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react"
import { formatAdminUserName, formatDate } from "@/lib/utils"
import { toast } from "sonner"

type SubmissionRow = {
  id: string
  title: string
  description: string | null
  completedAt: string
  createdAt: string
  submittedBy: { id: string; email: string; firstName: string | null; lastName: string | null; role: string }
}

type StaffUser = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

export function EmployeeTaskSubmissionsPageClient() {
  const [role, setRole] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<SubmissionRow[]>([])
  const [staff, setStaff] = React.useState<StaffUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [filterSubmittedBy, setFilterSubmittedBy] = React.useState("all")
  const [filterDate, setFilterDate] = React.useState("")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [formItems, setFormItems] = React.useState<string[]>([""])
  const [formCompletedAt, setFormCompletedAt] = React.useState("")
  const [editingRow, setEditingRow] = React.useState<SubmissionRow | null>(null)
  const [deleteRow, setDeleteRow] = React.useState<SubmissionRow | null>(null)
  const [viewRow, setViewRow] = React.useState<SubmissionRow | null>(null)
  const itemInputRefs = React.useRef<Array<HTMLInputElement | null>>([])
  const pendingFocusIndexRef = React.useRef<number | null>(null)

  const fetchRows = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (filterSubmittedBy !== "all") params.set("submittedById", filterSubmittedBy)
      if (filterDate) params.set("completedDate", filterDate)
      const url = params.size > 0 ? `/api/admin/employee-task-submissions?${params.toString()}` : "/api/admin/employee-task-submissions"
      const res = await fetch(url, { cache: "no-store" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to load submissions")
      setRows(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }, [search, filterSubmittedBy, filterDate])

  const fetchStaff = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff-list", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load staff")
      const data = await res.json()
      setStaff(Array.isArray(data) ? data : [])
    } catch {
      setStaff([])
    }
  }, [])

  React.useEffect(() => {
    fetchRows()
  }, [fetchRows])

  React.useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRole(data?.role ?? null))
      .catch(() => setRole(null))
  }, [])

  React.useEffect(() => {
    if (role === "ADMIN") fetchStaff()
  }, [role, fetchStaff])

  React.useEffect(() => {
    if (pendingFocusIndexRef.current == null) return
    const index = pendingFocusIndexRef.current
    const target = itemInputRefs.current[index]
    if (target) {
      target.focus()
      pendingFocusIndexRef.current = null
    }
  }, [formItems])

  const sortedStaff = React.useMemo(
    () =>
      [...staff].sort((a, b) => {
        const aLabel = (formatAdminUserName(a) || a.email).toLowerCase()
        const bLabel = (formatAdminUserName(b) || b.email).toLowerCase()
        return aLabel.localeCompare(bLabel)
      }),
    [staff]
  )

  const resetForm = () => {
    setFormItems([""])
    setFormCompletedAt("")
  }

  const parseItemsFromDescription = React.useCallback((value: string | null | undefined): string[] => {
    if (!value) return [""]
    const items = value
      .split("\n")
      .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean)
    return items.length > 0 ? items : [""]
  }, [])

  const serializeItems = React.useCallback((items: string[]): string => {
    return items
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n")
  }, [])

  const capitalizeFirstLetter = React.useCallback((value: string): string => {
    if (!value) return value
    return value.charAt(0).toUpperCase() + value.slice(1)
  }, [])

  const updateItem = React.useCallback((index: number, value: string) => {
    const normalized = capitalizeFirstLetter(value)
    setFormItems((prev) => prev.map((item, i) => (i === index ? normalized : item)))
  }, [capitalizeFirstLetter])

  const addItemField = React.useCallback(() => {
    setFormItems((prev) => [...prev, ""])
  }, [])

  const addItemFieldAndFocus = React.useCallback((currentIndex: number) => {
    pendingFocusIndexRef.current = currentIndex + 1
    setFormItems((prev) => [...prev, ""])
  }, [])

  const removeItemField = React.useCallback((index: number) => {
    setFormItems((prev) => {
      if (prev.length <= 1) return [""]
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [""]
    })
  }, [])

  const handleCreate = async () => {
    const serializedDescription = serializeItems(formItems)
    if (!serializedDescription) {
      toast.error("Please list at least one completed item")
      return
    }
    if (!formCompletedAt) {
      toast.error("Please select the submission date")
      return
    }

    setSubmitting(true)
    try {
      const completedAt = new Date(`${formCompletedAt}T12:00:00.000Z`).toISOString()
      const res = await fetch("/api/admin/employee-task-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: serializedDescription,
          completedAt,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to submit task")

      setCreateOpen(false)
      resetForm()
      toast.success("Completed task submitted")
      await fetchRows()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit task")
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (row: SubmissionRow) => {
    setEditingRow(row)
    setFormItems(parseItemsFromDescription(row.description))
    setFormCompletedAt(row.completedAt.slice(0, 10))
  }

  const handleUpdate = async () => {
    if (!editingRow) return
    const serializedDescription = serializeItems(formItems)
    if (!serializedDescription) {
      toast.error("Please list at least one completed item")
      return
    }
    if (!formCompletedAt) {
      toast.error("Please select the submission date")
      return
    }

    setSubmitting(true)
    try {
      const completedAt = new Date(`${formCompletedAt}T12:00:00.000Z`).toISOString()
      const res = await fetch(`/api/admin/employee-task-submissions/${editingRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: serializedDescription,
          completedAt,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to update submission")

      setEditingRow(null)
      resetForm()
      toast.success("Daily submission updated")
      await fetchRows()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update submission")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteRow) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/employee-task-submissions/${deleteRow.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to delete submission")
      setDeleteRow(null)
      toast.success("Daily submission deleted")
      await fetchRows()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete submission")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Task Submissions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Submit one daily update, then review, edit, or delete submissions.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <IconPlus className="h-4 w-4" />
          Submit Completed Task
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <div className="relative w-full sm:max-w-sm">
              <IconSearch className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search submissions..."
                className="h-[44px] pl-8"
              />
            </div>
            {role === "ADMIN" && (
              <Select value={filterSubmittedBy} onValueChange={setFilterSubmittedBy}>
                <SelectTrigger className="h-[42px] min-h-[42px] w-full sm:w-[240px]">
                  <SelectValue placeholder="Filter by staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff members</SelectItem>
                  {sortedStaff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {formatAdminUserName(member) || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-[44px] w-full sm:w-[180px]"
            />
            {((role === "ADMIN" && filterSubmittedBy !== "all") || !!filterDate || !!search.trim()) && (
              <Button
                type="button"
                variant="outline"
                className="h-[42px]"
                onClick={() => {
                  setFilterSubmittedBy("all")
                  setFilterDate("")
                  setSearch("")
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
            <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading submissions...
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Daily Update</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                      No submissions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setViewRow(row)}
                    >
                      <TableCell className="max-w-[420px]">
                        <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                          {row.description}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(row.completedAt)}</TableCell>
                      <TableCell>{formatAdminUserName(row.submittedBy)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(row)}
                          >
                            <IconPencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteRow(row)}
                          >
                            <IconTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Completed Task</DialogTitle>
              <DialogDescription>
                Log a task that has already been completed so admins can review the activity list.
              </DialogDescription>
            </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="submission-description">Daily Update</Label>
                  <div className="space-y-2">
                    {formItems.map((item, index) => (
                      <div key={`create-item-${index}`} className="flex items-center gap-2">
                        <Input
                          id={index === 0 ? "submission-description" : undefined}
                          ref={(node) => {
                            itemInputRefs.current[index] = node
                          }}
                          value={item}
                          onChange={(e) => updateItem(index, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              addItemFieldAndFocus(index)
                            }
                          }}
                          placeholder={
                            index === 0
                              ? "List what you completed today."
                              : `Completed item ${index + 1}`
                          }
                        />
                        {formItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItemField(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItemField}>
                    Add more
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submission-completed-date">Date</Label>
                  <Input
                    id="submission-completed-date"
                    type="date"
                    value={formCompletedAt}
                    onChange={(e) => setFormCompletedAt(e.target.value)}
                  />
                </div>
              </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false)
                  resetForm()
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={submitting}>
                {submitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewRow} onOpenChange={(open) => !open && setViewRow(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Daily Submission Details</DialogTitle>
              <DialogDescription>
                Review the full daily update submission.
              </DialogDescription>
            </DialogHeader>
            {viewRow && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Daily Update
                  </p>
                  <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                    {viewRow.description}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Date
                    </p>
                    <p className="text-sm">{formatDate(viewRow.completedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Submitted By
                    </p>
                    <p className="text-sm">{formatAdminUserName(viewRow.submittedBy)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              {viewRow && (
                <>
                  <Button
                    type="button"
                    onClick={() => {
                      setViewRow(null)
                      openEdit(viewRow)
                    }}
                  >
                    <IconPencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setViewRow(null)
                      setDeleteRow(viewRow)
                    }}
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
              <Button type="button" variant="outline" onClick={() => setViewRow(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingRow} onOpenChange={(open) => {
          if (!open) {
            setEditingRow(null)
            resetForm()
          }
        }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Daily Submission</DialogTitle>
              <DialogDescription>
                Update your daily entry.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-submission-description">Daily Update</Label>
                <div className="space-y-2">
                  {formItems.map((item, index) => (
                    <div key={`edit-item-${index}`} className="flex items-center gap-2">
                      <Input
                        id={index === 0 ? "edit-submission-description" : undefined}
                        ref={(node) => {
                          itemInputRefs.current[index] = node
                        }}
                        value={item}
                        onChange={(e) => updateItem(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addItemFieldAndFocus(index)
                          }
                        }}
                        placeholder={`Completed item ${index + 1}`}
                      />
                      {formItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItemField(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItemField}>
                  Add more
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-submission-completed-date">Date</Label>
                <Input
                  id="edit-submission-completed-date"
                  type="date"
                  value={formCompletedAt}
                  onChange={(e) => setFormCompletedAt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingRow(null)
                  resetForm()
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleUpdate} disabled={submitting}>
                {submitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Daily Submission</DialogTitle>
              <DialogDescription>
                This will permanently delete this daily submission.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteRow(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
