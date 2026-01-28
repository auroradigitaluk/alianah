import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <div className="flex flex-1 flex-col px-2 sm:px-4 lg:px-6 py-6">
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={`stat-${idx}`} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}
