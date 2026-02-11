"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchResultItem = {
  type: string
  id: string
  label: string
  subtitle?: string
  url: string
}

const TYPE_LABELS: Record<string, string> = {
  donor: "Donors",
  donation: "Donations",
  appeal: "Appeals",
  fundraiser: "Fundraisers",
  masjid: "Masjids",
  staff: "Staff",
  collection: "Collections",
  offline_income: "Offline income",
  recurring: "Recurring",
  water_project: "Water projects",
  sponsorship: "Sponsorships",
  task: "Tasks",
}

export function AdminGlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? [])
        setSelectedIndex(0)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  const goTo = useCallback(
    (item: SearchResultItem) => {
      setOpen(false)
      setQuery("")
      setResults([])
      const url = `${item.url}${item.url.includes("?") ? "&" : "?"}open=${encodeURIComponent(item.id)}`
      router.push(url)
    },
    [router]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      return
    }
    if (results.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      goTo(results[selectedIndex])
    }
  }

  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  useEffect(() => {
    if (!open) return
    setQuery("")
    setResults([])
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
        aria-label="Search (⌘K)"
      >
        <Search className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="overflow-hidden p-0 gap-0 border shadow-2xl max-w-xl w-[calc(100vw-2rem)] top-[20%] translate-y-0 translate-x-[-50%] left-[50%] rounded-xl bg-popover"
          onPointerDownOutside={() => setOpen(false)}
          onEscapeKeyDown={() => setOpen(false)}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden.Root>
            <DialogTitle>Search</DialogTitle>
          </VisuallyHidden.Root>

          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search donors, donations, appeals, masjids…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-12 flex-1 border-0 bg-transparent px-3 text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />
          </div>

          <div
            ref={listRef}
            className="max-h-[min(50vh,320px)] overflow-y-auto py-2"
            role="listbox"
            aria-label="Search results"
          >
            {loading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for &quot;{query.trim()}&quot;
              </div>
            )}
            {!loading &&
              results.map((item, i) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  data-index={i}
                  role="option"
                  aria-selected={i === selectedIndex}
                  className={cn(
                    "w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors",
                    i === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/80"
                  )}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => goTo(item)}
                >
                  <span className="font-medium truncate w-full">{item.label}</span>
                  <span className="flex items-center gap-1.5 w-full">
                    <span className="text-xs text-muted-foreground shrink-0">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">
                        · {item.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
