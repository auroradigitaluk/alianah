"use client"

import { Button } from "@/components/ui/button"

type ExportColumn<T> = {
  key: string
  label: string
  getValue: (item: T) => string | number | boolean | null | undefined
}

const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const downloadCsv = (filename: string, rows: Array<Array<string | number | boolean | null | undefined>>) => {
  const content = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n")
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ReportExportButton<T>({
  filename,
  columns,
  data,
}: {
  filename: string
  columns: ExportColumn<T>[]
  data: T[]
}) {
  const handleExport = () => {
    const rows = [
      columns.map((column) => column.label),
      ...data.map((row) => columns.map((column) => column.getValue(row))),
    ]
    downloadCsv(filename, rows)
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      Export CSV
    </Button>
  )
}
