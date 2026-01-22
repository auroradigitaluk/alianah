"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconCircleCheckFilled,
  IconGripVertical,
  IconLoader,
  IconAsterisk,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AdminTableColumn {
  id: string
  header: string
  accessorKey?: string
  cell?: (row: any) => React.ReactNode
  enableSorting?: boolean
}

interface AdminTableProps<T extends { id: string }> {
  data: T[]
  columns: AdminTableColumn[]
  onRowClick?: (item: T) => void
  enableDrag?: boolean
  enableSelection?: boolean
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function StatusBadge({ status, isActive }: { status?: string; isActive?: boolean }) {
  const displayStatus = status || (isActive ? "Active" : "Inactive")
  const isDone = displayStatus === "Done" || displayStatus === "Active" || displayStatus === "COMPLETED"
  const isInProcess = displayStatus === "In Process" || displayStatus === "Inactive"

  return (
    <Badge
      variant={isDone ? "default" : "outline"}
      className={`px-1.5 ${
        isDone
          ? ""
          : "text-muted-foreground bg-muted"
      }`}
    >
      {isDone ? (
        <IconCircleCheckFilled className="mr-1 size-3 fill-white" />
      ) : isInProcess ? (
        <IconAsterisk className="mr-1 size-3" />
      ) : (
        <IconLoader className="mr-1 size-3" />
      )}
      {displayStatus}
    </Badge>
  )
}

function DraggableRow<T extends { id: string }>({
  row,
  enableDrag,
  onRowClick,
}: {
  row: Row<T>
  enableDrag?: boolean
  onRowClick?: (item: T) => void
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
    disabled: !enableDrag,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={`relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 ${
        onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
      }`}
      style={
        enableDrag
          ? {
              transform: CSS.Transform.toString(transform),
              transition: transition,
            }
          : undefined
      }
      onClick={() => onRowClick?.(row.original)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function AdminTable<T extends { id: string }>({
  data: initialData,
  columns,
  onRowClick,
  enableDrag = false,
  enableSelection = false,
}: AdminTableProps<T>) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = React.useState(() => initialData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()

  useEffect(() => {
    setMounted(true)
  }, [])
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  const tableColumns: ColumnDef<T>[] = React.useMemo(() => {
    const cols: ColumnDef<T>[] = []

    if (enableDrag) {
      cols.push({
        id: "drag",
        header: () => null,
        cell: ({ row }) => <DragHandle id={row.original.id} />,
        enableSorting: false,
        enableHiding: false,
      })
    }

    if (enableSelection) {
      cols.push({
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      })
    }

    columns.forEach((col) => {
      cols.push({
        id: col.id,
        accessorKey: col.accessorKey || col.id,
        header: col.header,
        cell: col.cell
          ? ({ row }) => col.cell!(row.original)
          : ({ row }) => {
              const value = col.accessorKey
                ? (row.original as any)[col.accessorKey]
                : (row.original as any)[col.id]
              return value || "-"
            },
        enableSorting: col.enableSorting !== false,
      })
    })

    return cols
  }, [columns, enableDrag, enableSelection, mounted])

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: enableSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  function handleDragEnd(event: DragEndEvent) {
    if (!enableDrag) return
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  const tableContent = (
    <Table>
      <TableHeader className="bg-muted sticky top-0 z-10">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          enableDrag ? (
            <SortableContext
              items={dataIds}
              strategy={verticalListSortingStrategy}
            >
              {table.getRowModel().rows.map((row) => (
                <DraggableRow key={row.id} row={row} enableDrag={enableDrag} onRowClick={onRowClick} />
              ))}
            </SortableContext>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )
        ) : (
          <TableRow>
            <TableCell colSpan={tableColumns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className="w-full">
      <div className="overflow-x-auto overflow-hidden rounded-lg border">
        {enableDrag ? (
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            {tableContent}
          </DndContext>
        ) : (
          tableContent
        )}
      </div>
    </div>
  )
}

export { StatusBadge }
