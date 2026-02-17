import { getEmailPreviewHtml } from "./preview-data"
import { EmailPreviewClient } from "./email-preview-client"

export const dynamic = "force-dynamic"

export default async function EmailPreviewPage() {
  let htmlByType: Record<string, string>
  try {
    htmlByType = await getEmailPreviewHtml()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    htmlByType = {
      "offline-receipt": `<p>Failed to build preview: ${message}</p>`,
      "collection-receipt": `<p>Failed to build preview: ${message}</p>`,
      "water-donation": `<p>Failed to build preview: ${message}</p>`,
      "sponsorship-donation": `<p>Failed to build preview: ${message}</p>`,
    }
  }
  return <EmailPreviewClient htmlByType={htmlByType} />
}
