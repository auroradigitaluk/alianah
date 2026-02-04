"use client"

import * as React from "react"
import {
  IconFolder,
  IconFile,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconFileTypeDocx,
  IconFileTypeXls,
  IconFileTypeTxt,
  IconPlus,
  IconUpload,
  IconDownload,
  IconDotsVertical,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type DocumentFolder = {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  createdAt: string
}

type DocumentFile = {
  id: string
  folderId: string | null
  name: string
  blobUrl: string
  sizeBytes: number
  mimeType: string | null
  createdAt: string
}

type DocumentsResponse = {
  folders: DocumentFolder[]
  files: DocumentFile[]
  breadcrumb: { id: string; name: string }[]
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return IconFile
  if (mimeType === "application/pdf") return IconFileTypePdf
  if (mimeType === "application/msword") return IconFileTypeDoc
  if (mimeType.includes("wordprocessingml")) return IconFileTypeDocx
  if (mimeType === "application/vnd.ms-excel") return IconFileTypeXls
  if (mimeType.includes("spreadsheetml")) return IconFileTypeXls
  if (mimeType === "text/plain") return IconFileTypeTxt
  return IconFile
}

function isImage(mimeType: string | null): boolean {
  return Boolean(mimeType?.startsWith("image/"))
}

export function DocumentsPageClient() {
  const [folderId, setFolderId] = React.useState<string | null>(null)
  const [data, setData] = React.useState<DocumentsResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)
  const [newFolderOpen, setNewFolderOpen] = React.useState(false)
  const [newFolderName, setNewFolderName] = React.useState("")
  const [renameOpen, setRenameOpen] = React.useState(false)
  const [renameTarget, setRenameTarget] = React.useState<
    { id: string; name: string; type: "folder" | "file" } | null
  >(null)
  const [renameValue, setRenameValue] = React.useState("")
  const [deleteConfirm, setDeleteConfirm] = React.useState<
    { id: string; name: string; type: "folder" | "file" } | null
  >(null)
  const [previewFile, setPreviewFile] = React.useState<DocumentFile | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const fetchDocuments = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = folderId ? `?folderId=${folderId}` : ""
      const res = await fetch(`/api/admin/documents${params}`)
      if (!res.ok) throw new Error("Failed to load")
      const payload = (await res.json()) as DocumentsResponse
      setData(payload)
    } catch {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }, [folderId])

  React.useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    try {
      const res = await fetch("/api/admin/documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: folderId && folderId.trim() ? folderId : null,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          (payload as { error?: string }).error || "Failed to create folder"
        )
      }
      toast.success("Folder created")
      setNewFolderOpen(false)
      setNewFolderName("")
      fetchDocuments()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create folder")
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.set("file", file)
        if (folderId) formData.set("folderId", folderId)
        const res = await fetch("/api/admin/documents/upload", {
          method: "POST",
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Upload failed")
        }
      }
      toast.success("File(s) uploaded")
      fetchDocuments()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleRename = async () => {
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) return
    try {
      const res = await fetch(`/api/admin/documents/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error("Failed to rename")
      toast.success("Renamed")
      setRenameOpen(false)
      setRenameTarget(null)
      setRenameValue("")
      fetchDocuments()
    } catch {
      toast.error("Failed to rename")
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      const res = await fetch(`/api/admin/documents/${deleteConfirm.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Deleted")
      setDeleteConfirm(null)
      fetchDocuments()
    } catch {
      toast.error("Failed to delete")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Documents</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Charity Commission docs, annual reports, trustee details.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewFolderName("")
              setNewFolderOpen(true)
            }}
          >
            <IconPlus className="size-4" />
            New Folder
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <IconUpload className="size-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.txt"
            onChange={handleUpload}
          />
        </div>
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button
                type="button"
                onClick={() => setFolderId(null)}
                className="cursor-pointer"
              >
                Documents
              </button>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {data?.breadcrumb.map((item, i) => (
            <React.Fragment key={item.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {i === data.breadcrumb.length - 1 ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      onClick={() => setFolderId(item.id)}
                      className="cursor-pointer"
                    >
                      {item.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="py-3 transition-colors hover:bg-muted/30">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : !data?.folders.length && !data?.files.length ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No files yet. Create a folder or upload files.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewFolderOpen(true)}
                >
                  <IconPlus className="size-4" />
                  New Folder
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <IconUpload className="size-4" />
                  Upload
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-4">
              {data?.folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative flex flex-col items-center rounded-lg p-3 transition-colors hover:bg-muted/80"
                >
                    <button
                      type="button"
                      className="flex flex-col items-center gap-2"
                      onClick={() => setFolderId(folder.id)}
                    >
                    <div className="flex size-20 shrink-0 items-center justify-center">
                      <IconFolder className="size-20 text-primary" />
                    </div>
                    <span className="line-clamp-2 max-w-full text-center text-xs font-semibold">
                      {folder.name}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <IconDotsVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameTarget({
                            id: folder.id,
                            name: folder.name,
                            type: "folder",
                          })
                          setRenameValue(folder.name)
                          setRenameOpen(true)
                        }}
                      >
                        <IconPencil className="size-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() =>
                          setDeleteConfirm({
                            id: folder.id,
                            name: folder.name,
                            type: "folder",
                          })
                        }
                      >
                        <IconTrash className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {data?.files.map((file) => {
                const Icon = getFileIcon(file.mimeType)
                const showImagePreview = isImage(file.mimeType)
                const isPdf = file.mimeType === "application/pdf"
                const fileContent = (
                  <>
                    <div
                      className={`relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
                        isPdf ? "bg-primary/15" : "bg-muted/50"
                      }`}
                    >
                      <div
                        className={`absolute inset-0 flex items-center justify-center ${
                          isPdf ? "bg-primary/15" : "bg-muted/50"
                        }`}
                      >
                        <Icon
                          className={`size-12 ${isPdf ? "text-primary" : "text-muted-foreground"}`}
                        />
                      </div>
                      {showImagePreview && (
                        <img
                          src={file.blobUrl}
                          alt={file.name}
                          className="relative z-10 size-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      )}
                    </div>
                    <span className="line-clamp-2 max-w-full text-center text-xs font-semibold">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatSize(file.sizeBytes)}
                    </span>
                  </>
                )
                return (
                  <div
                    key={file.id}
                    className="group relative flex flex-col items-center rounded-lg p-3 transition-colors hover:bg-muted/80"
                  >
                    <button
                      type="button"
                      className="flex cursor-pointer flex-col items-center gap-2 bg-transparent text-left hover:bg-transparent"
                      onClick={() => setPreviewFile(file)}
                    >
                      {fileContent}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <IconDotsVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameTarget({
                              id: file.id,
                              name: file.name,
                              type: "file",
                            })
                            setRenameValue(file.name)
                            setRenameOpen(true)
                          }}
                        >
                          <IconPencil className="size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            setDeleteConfirm({
                              id: file.id,
                              name: file.name,
                              type: "file",
                            })
                          }
                        >
                          <IconTrash className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Charity Commission"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-value">Name</Label>
              <Input
                id="rename-value"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder={renameTarget?.name}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteConfirm?.type}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete &quot;{deleteConfirm?.name}&quot;?{" "}
            {deleteConfirm?.type === "folder" &&
              "This will delete all contents inside."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {previewFile && (
              <>
                {isImage(previewFile.mimeType) ? (
                  <img
                    src={previewFile.blobUrl}
                    alt={previewFile.name}
                    className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
                  />
                ) : previewFile.mimeType === "application/pdf" ? (
                  <iframe
                    src={previewFile.blobUrl}
                    title={previewFile.name}
                    className="h-[70vh] w-full min-h-[400px] rounded-lg border"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <div className="flex size-24 items-center justify-center rounded-lg bg-muted/50">
                      {(() => {
                        const Icon = getFileIcon(previewFile.mimeType)
                        return (
                          <Icon className="size-16 text-muted-foreground" />
                        )
                      })()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatSize(previewFile.sizeBytes)}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const a = document.createElement("a")
                      a.href = `${previewFile.blobUrl}?download=1`
                      a.download = previewFile.name
                      a.click()
                    }}
                  >
                    <IconDownload className="size-4" />
                    Download
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteConfirm({
                        id: previewFile.id,
                        name: previewFile.name,
                        type: "file",
                      })
                      setPreviewFile(null)
                    }}
                  >
                    <IconTrash className="size-4" />
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
