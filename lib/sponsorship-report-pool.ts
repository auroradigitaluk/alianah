/** Parse original PDF filename into stored metadata (e.g. "001.pdf" → childCode "001"). */
export function parsePoolPdfMeta(originalFileName: string): {
  fileName: string
  childCode: string
} {
  const fileName = originalFileName.trim()
  const base = fileName.replace(/\.pdf$/i, "").trim()
  const digitsOnly = base.match(/^(\d{1,6})$/)
  if (digitsOnly) {
    return { fileName, childCode: digitsOnly[1] }
  }
  const trailingDigits = base.match(/(\d{1,6})$/)
  if (trailingDigits) {
    return { fileName, childCode: trailingDigits[1] }
  }
  return { fileName, childCode: base || fileName }
}

export function displayChildCode(entry: {
  childCode?: string | null
  fileName?: string | null
  pdfUrl?: string
}): string | null {
  if (entry.childCode?.trim()) return entry.childCode.trim()
  if (entry.fileName?.trim()) {
    return parsePoolPdfMeta(entry.fileName).childCode
  }
  if (entry.pdfUrl) {
    const segment = entry.pdfUrl.split("/").pop() ?? ""
    const name = segment.replace(/^\d+-\d+-/, "")
    if (name) return parsePoolPdfMeta(name).childCode
  }
  return null
}

export function isPoolEntryAvailable(entry: {
  assignedDonationId: string | null
  assignedRecurringRef: string | null
}): boolean {
  return !entry.assignedDonationId && !entry.assignedRecurringRef
}
