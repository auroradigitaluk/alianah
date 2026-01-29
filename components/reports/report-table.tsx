"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type ReportTableColumn<T> = {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  align?: "left" | "right" | "center"
}

export function ReportTable<T extends { label: string }>({
  columns,
  data,
}: {
  columns: ReportTableColumn<T>[]
  data: T[]
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                No data available for this period.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={`${row.label}-${index}`}>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={
                      column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""
                    }
                  >
                    {column.render ? column.render(row) : (row as Record<string, unknown>)[column.key] as React.ReactNode}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
