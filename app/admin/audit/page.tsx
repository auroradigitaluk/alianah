import { AdminHeader } from "@/components/admin-header"
import { prisma } from "@/lib/prisma"
import { AuditTable } from "@/components/audit-table"

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getAuditLogs() {
  try {
    return await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { adminUser: { select: { email: true } } },
    })
  } catch {
    return []
  }
}

export default async function AuditPage() {
  const logs = await getAuditLogs()

  return (
    <>
      <AdminHeader title="Audit Log" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
            <div className="px-2 sm:px-4 lg:px-6">
              <div className="flex flex-col gap-4 sm:gap-6">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Audit Log</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">System activity log</p>
                </div>
                <div>
                  <AuditTable logs={logs} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
