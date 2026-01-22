"use client"

import { useState } from "react"
import { AdminTable } from "@/components/admin-table"
import { Badge } from "@/components/ui/badge"
import { IconFileText } from "@tabler/icons-react"
import { DetailModal } from "@/components/detail-modal"
import { formatDateTime } from "@/lib/utils"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId?: string | null
  createdAt: Date
  adminUser: { email: string }
}

export function AuditTable({ logs }: { logs: AuditLog[] }) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  return (
    <>
      <AdminTable
        data={logs}
        onRowClick={(log) => setSelectedLog(log)}
        columns={[
        {
          id: "action",
          header: "Header",
          cell: (log) => (
            <div className="font-medium">{log.action}</div>
          ),
        },
        {
          id: "type",
          header: "Type",
          cell: (log) => (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <IconFileText className="mr-1 size-3" />
              {log.entityType}
            </Badge>
          ),
        },
        {
          id: "entityId",
          header: "Entity ID",
          cell: (log) => (
            <div className="text-sm">{log.entityId || "N/A"}</div>
          ),
        },
        {
          id: "user",
          header: "User",
          cell: (log) => (
            <div className="text-sm">{log.adminUser.email}</div>
          ),
        },
        {
          id: "date",
          header: "Date",
          cell: (log) => (
            <div className="text-sm">
              {formatDateTime(log.createdAt)}
            </div>
          ),
        },
      ]}
      enableSelection={false}
      />
      <DetailModal
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        title="Audit Log Details"
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</h3>
              <p className="text-base font-semibold">{selectedLog.action}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</h3>
              <Badge variant="outline" className="text-muted-foreground px-1.5">
                <IconFileText className="mr-1 size-3" />
                {selectedLog.entityType}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity ID</h3>
              <p className="text-base">{selectedLog.entityId || "N/A"}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User</h3>
              <p className="text-base">{selectedLog.adminUser.email}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</h3>
              <p className="text-base">{formatDateTime(selectedLog.createdAt)}</p>
            </div>
          </div>
        )}
      </DetailModal>
    </>
  )
}
