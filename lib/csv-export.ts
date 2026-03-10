/**
 * Flatten an object for CSV: nested objects become key.path, arrays/values stringified.
 * Dates become ISO strings.
 */
export function flattenForCsv(obj: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (obj === null || obj === undefined) return out
  if (typeof obj !== "object") {
    out["value"] = String(obj)
    return out
  }
  if (obj instanceof Date) {
    out["date"] = obj.toISOString()
    return out
  }
  if (Array.isArray(obj)) {
    out["value"] = JSON.stringify(obj)
    return out
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      out[k] = ""
      continue
    }
    if (v instanceof Date) {
      out[k] = v.toISOString()
      continue
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) => (item && typeof item === "object" && !(item instanceof Date) ? JSON.stringify(item) : String(item))).join("; ")
      continue
    }
    if (typeof v === "object" && v !== null && !(v instanceof Date)) {
      const nested = flattenForCsv(v)
      for (const [nestedK, nestedV] of Object.entries(nested)) {
        out[`${k}.${nestedK}`] = nestedV
      }
      continue
    }
    out[k] = String(v)
  }
  return out
}

function escapeCsvValue(value: string): string {
  if (!/[\n,"]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

/** Build CSV string from array of objects. Uses flattenForCsv so nested objects become columns. */
export function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const flattened = rows.map((r) => flattenForCsv(r))
  const allKeys = new Set<string>()
  flattened.forEach((f) => Object.keys(f).forEach((k) => allKeys.add(k)))
  const headers = Array.from(allKeys).sort()
  const lines = [headers.map(escapeCsvValue).join(",")]
  for (const row of flattened) {
    const cells = headers.map((h) => escapeCsvValue(row[h] ?? ""))
    lines.push(cells.join(","))
  }
  return lines.join("\n")
}
