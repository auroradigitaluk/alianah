import { verifyCollectionReceiptToken } from "@/lib/collection-receipt-token"
import { formatDate } from "@/lib/utils"
import { getOrganizationSettings } from "@/lib/settings"
import { CollectionPrintTrigger } from "./collection-print-trigger"

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  JUMMAH: "Jummah",
  RAMADAN: "Ramadan",
  EID: "Eid",
  SPECIAL: "Special",
  OTHER: "Other",
}

function moneyPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`
}

type Props = { searchParams: Promise<{ t?: string }> }

export default async function CollectionReceiptPrintPage({ searchParams }: Props) {
  const { t } = await searchParams
  if (!t) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-gray-600">
        <p>Missing print link. Please use the link from your collection receipt email.</p>
      </div>
    )
  }

  const payload = verifyCollectionReceiptToken(t)
  if (!payload) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-gray-600">
        <p>This link is invalid or has expired. Please request a new receipt if needed.</p>
      </div>
    )
  }

  const settings = await getOrganizationSettings()
  const charityName = settings.charityName
  const collectedDate = formatDate(payload.collectedAt)
  const typeLabel = COLLECTION_TYPE_LABELS[payload.collectionType as string] ?? payload.collectionType

  const rows: Array<{ label: string; value: string }> = []
  if (payload.sadaqahPence > 0) rows.push({ label: "Sadaqah", value: moneyPence(payload.sadaqahPence) })
  if (payload.zakatPence > 0) rows.push({ label: "Zakat", value: moneyPence(payload.zakatPence) })
  if (payload.lillahPence > 0) rows.push({ label: "Lillah", value: moneyPence(payload.lillahPence) })
  if (payload.cardPence > 0) rows.push({ label: "Card / General", value: moneyPence(payload.cardPence) })

  return (
    <>
      <CollectionPrintTrigger />
      <div className="mx-auto max-w-lg px-4 py-8 print:py-4">
        <h1 className="mb-8 text-lg font-bold uppercase tracking-wide text-gray-900 print:mb-6">
          Collection receipt
        </h1>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 text-gray-500">Location</td>
              <td className="py-1.5 text-right font-semibold text-gray-900">{payload.locationName}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-gray-500">Collection type</td>
              <td className="py-1.5 text-right font-semibold text-gray-900">{typeLabel}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-gray-500">Date collected</td>
              <td className="py-1.5 text-right font-semibold text-gray-900">{collectedDate}</td>
            </tr>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-1.5 text-gray-500">{r.label}</td>
                <td className="py-1.5 text-right font-semibold text-gray-900">{r.value}</td>
              </tr>
            ))}
            <tr>
              <td className="border-t border-gray-200 pt-2 font-semibold text-gray-900">Total</td>
              <td className="border-t border-gray-200 pt-2 text-right font-semibold text-gray-900">
                {moneyPence(payload.totalPence)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-8 text-sm leading-relaxed text-gray-500 print:mt-6">
          Thank you for your support and for partnering with {charityName}. Your collection helps us
          reach more people in need and continue our work. We are deeply grateful for your commitment.
        </p>

        <p className="mt-8 text-xs text-gray-400 print:mt-6">
          {charityName} · This is a print copy of your collection receipt.
        </p>
      </div>
    </>
  )
}
