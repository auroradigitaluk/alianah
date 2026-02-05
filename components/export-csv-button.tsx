"use client"

import { useEffect, useMemo, useState } from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatCurrency,
  formatDate,
  formatDonorName,
  formatEnum,
  formatPaymentMethod,
} from "@/lib/utils"

type ExportVariant =
  | "donations"
  | "recurring"
  | "offlineIncome"
  | "collections"
  | "fundraisers"
  | "donors"
  | "masjids"

type SelectOption = { value: string; label: string }

type ExportColumn<T> = {
  key: string
  label: string
  getValue: (item: T) => string | number | boolean | null | undefined
  defaultVisible?: boolean
}

type TextFilter<T> = {
  type: "text"
  id: string
  label: string
  placeholder?: string
  getValue: (item: T) => string
}

type SelectFilter<T> = {
  type: "select"
  id: string
  label: string
  options: SelectOption[]
  allLabel?: string
  getValue: (item: T) => string
}

type DateRangeFilter<T> = {
  type: "dateRange"
  id: string
  labelFrom: string
  labelTo: string
  getValue: (item: T) => Date | string | null | undefined
}

type ExportFilter<T> = TextFilter<T> | SelectFilter<T> | DateRangeFilter<T>

type ExportConfig<T> = {
  title: string
  description: string
  filename: string
  columns: ExportColumn<T>[]
  filters: ExportFilter<T>[]
}

function toDate(value: unknown) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function downloadCsv(filename: string, rows: Array<Array<string | number | boolean | null | undefined>>) {
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

type DonationsRow = {
  amountPence: number
  status: string
  paymentMethod: string
  donationType: string
  createdAt: string | Date
  completedAt?: string | Date | null
  orderNumber?: string | null
  transactionId?: string | null
  giftAid: boolean
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  donor: { title?: string | null; firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
  product?: { name: string } | null
}

type RecurringRow = {
  amountPence: number
  frequency: string
  status: string
  subscriptionId?: string | null
  nextPaymentDate?: string | Date | null
  lastPaymentDate?: string | Date | null
  donor: { title?: string | null; firstName: string; lastName: string; email: string }
  appeal?: { title: string } | null
}

type OfflineIncomeRow = {
  amountPence: number
  donationType: string
  source: string
  receivedAt: string | Date
  notes?: string | null
  appeal?: { title: string } | null
}

type CollectionsRow = {
  amountPence: number
  donationType: string
  type: string
  collectedAt: string | Date
  notes?: string | null
  masjid?: { name: string } | null
  appeal?: { title: string } | null
}

type FundraisersRow = {
  title: string
  slug: string
  fundraiserName: string
  email?: string
  isActive: boolean
  amountRaised: number
  campaign: { title: string }
}

type DonorsRow = {
  title?: string | null
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
  totalAmountDonated: number
}

type MasjidsRow = {
  name: string
  status: string
  city: string
  address: string
  postcode?: string | null
  country?: string | null
  region?: string | null
  contactName?: string | null
  contactRole?: string | null
  phone?: string | null
  phoneAlt?: string | null
  email?: string | null
  emailAlt?: string | null
  secondaryContactName?: string | null
  secondaryContactRole?: string | null
  website?: string | null
  preferredContactMethod?: string | null
  lastContactedAt?: string | Date | null
  nextFollowUpAt?: string | Date | null
  notes?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
  collectionCount: number
  totalAmountRaised: number
}

function buildConfig(variant: ExportVariant, data: unknown[]): ExportConfig<unknown> {
  if (variant === "donations") {
    const rows = data as DonationsRow[]
    const statusOptions = Array.from(new Set(rows.map((item) => item.status))).sort()
    return {
      title: "Export donations",
      description: "Choose filters and columns for the CSV export.",
      filename: "donations",
      columns: [
        {
          key: "donorFirstName",
          label: "Donor First Name",
          getValue: (item) => (item as DonationsRow).donor.firstName,
        },
        {
          key: "donorLastName",
          label: "Donor Last Name",
          getValue: (item) => (item as DonationsRow).donor.lastName,
        },
        {
          key: "donorEmail",
          label: "Donor Email",
          getValue: (item) => (item as DonationsRow).donor.email,
        },
        {
          key: "amount",
          label: "Amount",
          getValue: (item) => formatCurrency((item as DonationsRow).amountPence),
        },
        {
          key: "status",
          label: "Status",
          getValue: (item) => formatEnum((item as DonationsRow).status),
        },
        {
          key: "paymentMethod",
          label: "Payment Method",
          getValue: (item) => formatPaymentMethod((item as DonationsRow).paymentMethod),
        },
        {
          key: "campaign",
          label: "Campaign / Appeal / Product",
          getValue: (item) =>
            (item as DonationsRow).product?.name ||
            (item as DonationsRow).appeal?.title ||
            "General",
        },
        {
          key: "orderNumber",
          label: "Order Number",
          getValue: (item) => (item as DonationsRow).orderNumber || "",
        },
        {
          key: "giftAid",
          label: "Gift Aid",
          getValue: (item) => ((item as DonationsRow).giftAid ? "Yes" : "No"),
        },
        {
          key: "date",
          label: "Date",
          getValue: (item) =>
            formatDate(
              (item as DonationsRow).completedAt || (item as DonationsRow).createdAt
            ),
        },
        {
          key: "billingAddress",
          label: "Billing Address",
          getValue: (item) => (item as DonationsRow).billingAddress || "",
        },
        {
          key: "billingCity",
          label: "Billing City",
          getValue: (item) => (item as DonationsRow).billingCity || "",
        },
        {
          key: "billingPostcode",
          label: "Billing Postcode",
          getValue: (item) => (item as DonationsRow).billingPostcode || "",
        },
        {
          key: "billingCountry",
          label: "Billing Country",
          getValue: (item) => (item as DonationsRow).billingCountry || "",
        },
        {
          key: "transactionId",
          label: "Transaction ID",
          getValue: (item) => (item as DonationsRow).transactionId || "",
          defaultVisible: false,
        },
      ],
      filters: [
        {
          type: "text",
          id: "donor",
          label: "Donor name",
          placeholder: "Search donor",
          getValue: (item) => formatDonorName((item as DonationsRow).donor),
        },
        {
          type: "text",
          id: "order",
          label: "Order number",
          placeholder: "Search order",
          getValue: (item) => (item as DonationsRow).orderNumber || "",
        },
        {
          type: "text",
          id: "appeal",
          label: "Appeal",
          placeholder: "Search appeal",
          getValue: (item) =>
            (item as DonationsRow).product?.name ||
            (item as DonationsRow).appeal?.title ||
            "General",
        },
        {
          type: "select",
          id: "status",
          label: "Status",
          options: statusOptions.map((status) => ({
            value: status,
            label: formatEnum(status),
          })),
          allLabel: "All statuses",
          getValue: (item) => (item as DonationsRow).status,
        },
        {
          type: "dateRange",
          id: "date",
          labelFrom: "From",
          labelTo: "To",
          getValue: (item) =>
            (item as DonationsRow).completedAt || (item as DonationsRow).createdAt,
        },
      ],
    }
  }

  if (variant === "recurring") {
    const rows = data as RecurringRow[]
    const statusOptions = Array.from(new Set(rows.map((item) => item.status))).sort()
    return {
      title: "Export recurring donations",
      description: "Choose filters and columns for the CSV export.",
      filename: "recurring-donations",
      columns: [
        {
          key: "donorFirstName",
          label: "Donor First Name",
          getValue: (item) => (item as RecurringRow).donor.firstName,
        },
        {
          key: "donorLastName",
          label: "Donor Last Name",
          getValue: (item) => (item as RecurringRow).donor.lastName,
        },
        {
          key: "donorEmail",
          label: "Donor Email",
          getValue: (item) => (item as RecurringRow).donor.email,
        },
        {
          key: "amount",
          label: "Amount",
          getValue: (item) => formatCurrency((item as RecurringRow).amountPence),
        },
        {
          key: "frequency",
          label: "Frequency",
          getValue: (item) => formatEnum((item as RecurringRow).frequency),
        },
        {
          key: "status",
          label: "Status",
          getValue: (item) => formatEnum((item as RecurringRow).status),
        },
        {
          key: "appeal",
          label: "Appeal",
          getValue: (item) => (item as RecurringRow).appeal?.title || "General",
        },
        {
          key: "nextPayment",
          label: "Next Payment",
          getValue: (item) => formatDate((item as RecurringRow).nextPaymentDate),
        },
        {
          key: "lastPayment",
          label: "Last Payment",
          getValue: (item) => formatDate((item as RecurringRow).lastPaymentDate),
          defaultVisible: false,
        },
        {
          key: "subscriptionId",
          label: "Subscription ID",
          getValue: (item) => (item as RecurringRow).subscriptionId || "",
          defaultVisible: false,
        },
      ],
      filters: [
        {
          type: "text",
          id: "appeal",
          label: "Appeal",
          placeholder: "Search appeal",
          getValue: (item) => (item as RecurringRow).appeal?.title || "General",
        },
        {
          type: "select",
          id: "status",
          label: "Status",
          options: statusOptions.map((status) => ({
            value: status,
            label: formatEnum(status),
          })),
          allLabel: "All statuses",
          getValue: (item) => (item as RecurringRow).status,
        },
        {
          type: "dateRange",
          id: "nextPayment",
          labelFrom: "Next payment from",
          labelTo: "Next payment to",
          getValue: (item) => (item as RecurringRow).nextPaymentDate,
        },
      ],
    }
  }

  if (variant === "offlineIncome") {
    const rows = data as OfflineIncomeRow[]
    const sourceOptions = Array.from(new Set(rows.map((item) => item.source))).sort()
    return {
      title: "Export offline income",
      description: "Choose filters and columns for the CSV export.",
      filename: "offline-income",
      columns: [
        {
          key: "appeal",
          label: "Appeal",
          getValue: (item) => (item as OfflineIncomeRow).appeal?.title || "General",
        },
        {
          key: "amount",
          label: "Amount",
          getValue: (item) => formatCurrency((item as OfflineIncomeRow).amountPence),
        },
        {
          key: "source",
          label: "Source",
          getValue: (item) => formatEnum((item as OfflineIncomeRow).source),
        },
        {
          key: "donationType",
          label: "Donation Type",
          getValue: (item) => formatEnum((item as OfflineIncomeRow).donationType),
        },
        {
          key: "receivedAt",
          label: "Date Received",
          getValue: (item) => formatDate((item as OfflineIncomeRow).receivedAt),
        },
        {
          key: "notes",
          label: "Notes",
          getValue: (item) => (item as OfflineIncomeRow).notes || "",
          defaultVisible: false,
        },
      ],
      filters: [
        {
          type: "text",
          id: "appeal",
          label: "Appeal",
          placeholder: "Search appeal",
          getValue: (item) => (item as OfflineIncomeRow).appeal?.title || "General",
        },
        {
          type: "select",
          id: "source",
          label: "Source",
          options: sourceOptions.map((source) => ({
            value: source,
            label: formatEnum(source),
          })),
          allLabel: "All sources",
          getValue: (item) => (item as OfflineIncomeRow).source,
        },
        {
          type: "dateRange",
          id: "receivedAt",
          labelFrom: "From",
          labelTo: "To",
          getValue: (item) => (item as OfflineIncomeRow).receivedAt,
        },
      ],
    }
  }

  if (variant === "collections") {
    const rows = data as CollectionsRow[]
    const typeOptions = Array.from(new Set(rows.map((item) => item.type))).sort()
    return {
      title: "Export collections",
      description: "Choose filters and columns for the CSV export.",
      filename: "collections",
      columns: [
        {
          key: "masjid",
          label: "Masjid",
          getValue: (item) => (item as CollectionsRow).masjid?.name || "No masjid",
        },
        {
          key: "appeal",
          label: "Appeal",
          getValue: (item) => (item as CollectionsRow).appeal?.title || "General",
        },
        {
          key: "amount",
          label: "Amount",
          getValue: (item) => formatCurrency((item as CollectionsRow).amountPence),
        },
        {
          key: "type",
          label: "Type",
          getValue: (item) => formatEnum((item as CollectionsRow).type),
        },
        {
          key: "donationType",
          label: "Donation Type",
          getValue: (item) => formatEnum((item as CollectionsRow).donationType),
        },
        {
          key: "collectedAt",
          label: "Date Collected",
          getValue: (item) => formatDate((item as CollectionsRow).collectedAt),
        },
        {
          key: "notes",
          label: "Notes",
          getValue: (item) => (item as CollectionsRow).notes || "",
          defaultVisible: false,
        },
      ],
      filters: [
        {
          type: "text",
          id: "masjid",
          label: "Masjid",
          placeholder: "Search masjid",
          getValue: (item) => (item as CollectionsRow).masjid?.name || "No masjid",
        },
        {
          type: "text",
          id: "appeal",
          label: "Appeal",
          placeholder: "Search appeal",
          getValue: (item) => (item as CollectionsRow).appeal?.title || "General",
        },
        {
          type: "select",
          id: "type",
          label: "Type",
          options: typeOptions.map((type) => ({
            value: type,
            label: formatEnum(type),
          })),
          allLabel: "All types",
          getValue: (item) => (item as CollectionsRow).type,
        },
        {
          type: "dateRange",
          id: "collectedAt",
          labelFrom: "From",
          labelTo: "To",
          getValue: (item) => (item as CollectionsRow).collectedAt,
        },
      ],
    }
  }

  if (variant === "fundraisers") {
    const rows = data as FundraisersRow[]
    return {
      title: "Export fundraisers",
      description: "Choose filters and columns for the CSV export.",
      filename: "fundraisers",
      columns: [
        {
          key: "title",
          label: "Title",
          getValue: (item) => (item as FundraisersRow).title,
        },
        {
          key: "fundraiserName",
          label: "Fundraiser",
          getValue: (item) => (item as FundraisersRow).fundraiserName,
        },
        {
          key: "email",
          label: "Email",
          getValue: (item) => (item as FundraisersRow).email || "",
        },
        {
          key: "campaign",
          label: "Campaign",
          getValue: (item) => (item as FundraisersRow).campaign.title,
        },
        {
          key: "status",
          label: "Status",
          getValue: (item) => ((item as FundraisersRow).isActive ? "Active" : "Inactive"),
        },
        {
          key: "amountRaised",
          label: "Amount Raised",
          getValue: (item) => formatCurrency((item as FundraisersRow).amountRaised),
        },
        {
          key: "slug",
          label: "Slug",
          getValue: (item) => (item as FundraisersRow).slug,
          defaultVisible: false,
        },
      ],
      filters: [
        {
          type: "text",
          id: "campaign",
          label: "Campaign",
          placeholder: "Search campaign",
          getValue: (item) => (item as FundraisersRow).campaign.title,
        },
        {
          type: "text",
          id: "fundraiser",
          label: "Fundraiser or title",
          placeholder: "Search fundraiser",
          getValue: (item) =>
            `${(item as FundraisersRow).fundraiserName} ${(item as FundraisersRow).title}`,
        },
        {
          type: "select",
          id: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
          allLabel: "All statuses",
          getValue: (item) =>
            (item as FundraisersRow).isActive ? "active" : "inactive",
        },
      ],
    }
  }

  if (variant === "donors") {
    return {
      title: "Export donors",
      description: "Choose filters and columns for the CSV export.",
      filename: "donors",
      columns: [
        {
          key: "firstName",
          label: "First Name",
          getValue: (item) => (item as DonorsRow).firstName,
        },
        {
          key: "lastName",
          label: "Last Name",
          getValue: (item) => (item as DonorsRow).lastName,
        },
        {
          key: "email",
          label: "Email",
          getValue: (item) => (item as DonorsRow).email,
        },
        {
          key: "phone",
          label: "Phone",
          getValue: (item) => (item as DonorsRow).phone || "",
        },
        {
          key: "address",
          label: "Address",
          getValue: (item) => (item as DonorsRow).address || "",
        },
        {
          key: "city",
          label: "City",
          getValue: (item) => (item as DonorsRow).city || "",
        },
        {
          key: "postcode",
          label: "Postcode",
          getValue: (item) => (item as DonorsRow).postcode || "",
        },
        {
          key: "country",
          label: "Country",
          getValue: (item) => (item as DonorsRow).country || "",
        },
        {
          key: "totalAmountDonated",
          label: "Total Donated",
          getValue: (item) => formatCurrency((item as DonorsRow).totalAmountDonated),
        },
      ],
      filters: [
        {
          type: "text",
          id: "name",
          label: "Donor name or email",
          placeholder: "Search donor",
          getValue: (item) =>
            `${formatDonorName(item as DonorsRow)} ${(item as DonorsRow).email}`,
        },
        {
          type: "text",
          id: "city",
          label: "City",
          placeholder: "Filter by city",
          getValue: (item) => (item as DonorsRow).city || "",
        },
        {
          type: "text",
          id: "country",
          label: "Country",
          placeholder: "Filter by country",
          getValue: (item) => (item as DonorsRow).country || "",
        },
      ],
    }
  }

  return {
    title: "Export masjids",
    description: "Choose filters and columns for the CSV export.",
    filename: "masjids",
    columns: [
      { key: "name", label: "Name", getValue: (item) => (item as MasjidsRow).name },
      {
        key: "status",
        label: "Status",
        getValue: (item) => formatEnum((item as MasjidsRow).status || ""),
      },
      { key: "city", label: "City", getValue: (item) => (item as MasjidsRow).city },
      {
        key: "address",
        label: "Address",
        getValue: (item) => (item as MasjidsRow).address,
      },
      {
        key: "postcode",
        label: "Postcode",
        getValue: (item) => (item as MasjidsRow).postcode || "",
        defaultVisible: false,
      },
      {
        key: "country",
        label: "Country",
        getValue: (item) => (item as MasjidsRow).country || "",
        defaultVisible: false,
      },
      {
        key: "region",
        label: "Region",
        getValue: (item) => (item as MasjidsRow).region || "",
        defaultVisible: false,
      },
      {
        key: "contactName",
        label: "Contact Name",
        getValue: (item) => (item as MasjidsRow).contactName || "",
      },
      {
        key: "contactRole",
        label: "Contact Role",
        getValue: (item) => (item as MasjidsRow).contactRole || "",
        defaultVisible: false,
      },
      {
        key: "phone",
        label: "Phone",
        getValue: (item) => (item as MasjidsRow).phone || "",
      },
      {
        key: "phoneAlt",
        label: "Secondary Phone",
        getValue: (item) => (item as MasjidsRow).phoneAlt || "",
        defaultVisible: false,
      },
      {
        key: "email",
        label: "Email",
        getValue: (item) => (item as MasjidsRow).email || "",
      },
      {
        key: "emailAlt",
        label: "Secondary Email",
        getValue: (item) => (item as MasjidsRow).emailAlt || "",
        defaultVisible: false,
      },
      {
        key: "secondaryContactName",
        label: "Secondary Contact Name",
        getValue: (item) => (item as MasjidsRow).secondaryContactName || "",
        defaultVisible: false,
      },
      {
        key: "secondaryContactRole",
        label: "Secondary Contact Role",
        getValue: (item) => (item as MasjidsRow).secondaryContactRole || "",
        defaultVisible: false,
      },
      {
        key: "website",
        label: "Website",
        getValue: (item) => (item as MasjidsRow).website || "",
        defaultVisible: false,
      },
      {
        key: "preferredContactMethod",
        label: "Preferred Contact Method",
        getValue: (item) =>
          (item as MasjidsRow).preferredContactMethod
            ? formatEnum((item as MasjidsRow).preferredContactMethod || "")
            : "",
        defaultVisible: false,
      },
      {
        key: "lastContactedAt",
        label: "Last Contacted",
        getValue: (item) => formatDate((item as MasjidsRow).lastContactedAt),
        defaultVisible: false,
      },
      {
        key: "nextFollowUpAt",
        label: "Next Follow-up",
        getValue: (item) => formatDate((item as MasjidsRow).nextFollowUpAt),
        defaultVisible: false,
      },
      {
        key: "notes",
        label: "Notes",
        getValue: (item) => (item as MasjidsRow).notes || "",
        defaultVisible: false,
      },
      {
        key: "collectionCount",
        label: "Collection Count",
        getValue: (item) => (item as MasjidsRow).collectionCount,
      },
      {
        key: "totalAmountRaised",
        label: "Total Raised",
        getValue: (item) => formatCurrency((item as MasjidsRow).totalAmountRaised),
      },
      {
        key: "createdAt",
        label: "Created",
        getValue: (item) => formatDate((item as MasjidsRow).createdAt),
        defaultVisible: false,
      },
      {
        key: "updatedAt",
        label: "Updated",
        getValue: (item) => formatDate((item as MasjidsRow).updatedAt),
        defaultVisible: false,
      },
    ],
    filters: [
      {
        type: "text",
        id: "name",
        label: "Masjid name",
        placeholder: "Search masjid",
        getValue: (item) => (item as MasjidsRow).name,
      },
      {
        type: "text",
        id: "city",
        label: "City",
        placeholder: "Filter by city",
        getValue: (item) => (item as MasjidsRow).city,
      },
      {
        type: "select",
        id: "status",
        label: "Status",
        allLabel: "All statuses",
        options: [
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
          { value: "PROSPECT", label: "Prospect" },
          { value: "ON_HOLD", label: "On hold" },
        ],
        getValue: (item) => (item as MasjidsRow).status || "",
      },
    ],
  }
}

export function ExportCsvButton({
  data,
  variant,
}: {
  data: unknown[]
  variant: ExportVariant
}) {
  const config = useMemo(() => buildConfig(variant, data), [variant, data])
  const [open, setOpen] = useState(false)

  const textSelectDefaults = useMemo(() => {
    const defaults: Record<string, string> = {}
    config.filters.forEach((filter) => {
      if (filter.type === "text") {
        defaults[filter.id] = ""
      } else if (filter.type === "select") {
        defaults[filter.id] = "all"
      }
    })
    return defaults
  }, [config.filters])

  const dateDefaults = useMemo(() => {
    const defaults: Record<string, { from: string; to: string }> = {}
    config.filters.forEach((filter) => {
      if (filter.type === "dateRange") {
        defaults[filter.id] = { from: "", to: "" }
      }
    })
    return defaults
  }, [config.filters])

  const [textSelectValues, setTextSelectValues] = useState(textSelectDefaults)
  const [dateValues, setDateValues] = useState(dateDefaults)

  const defaultColumns = useMemo(
    () => config.columns.filter((col) => col.defaultVisible !== false).map((col) => col.key),
    [config.columns]
  )
  const [selectedColumns, setSelectedColumns] = useState(defaultColumns)

  useEffect(() => {
    setTextSelectValues(textSelectDefaults)
    setDateValues(dateDefaults)
    setSelectedColumns(defaultColumns)
  }, [dateDefaults, defaultColumns, textSelectDefaults])

  const filteredData = useMemo(() => {
    const normalized = Object.fromEntries(
      Object.entries(textSelectValues).map(([key, value]) => [
        key,
        value.trim().toLowerCase(),
      ])
    )

    return data.filter((item) => {
      return config.filters.every((filter) => {
        if (filter.type === "text") {
          const value = normalized[filter.id]
          if (!value) return true
          return filter.getValue(item).toLowerCase().includes(value)
        }
        if (filter.type === "select") {
          const value = textSelectValues[filter.id]
          if (!value || value === "all") return true
          return filter.getValue(item) === value
        }
        const range = dateValues[filter.id]
        const from = range?.from ? toDate(range.from) : null
        const to = range?.to ? toDate(range.to) : null
        const itemDate = toDate(filter.getValue(item))
        if (!from && !to) return true
        if (!itemDate) return false
        const fromCheck = !from || itemDate >= from
        const toCheck = !to || itemDate <= to
        return fromCheck && toCheck
      })
    })
  }, [config.filters, data, dateValues, textSelectValues])

  const handleClear = () => {
    setTextSelectValues(textSelectDefaults)
    setDateValues(dateDefaults)
    setSelectedColumns(defaultColumns)
  }

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    )
  }

  const handleExport = () => {
    const activeColumns = config.columns.filter((col) => selectedColumns.includes(col.key))
    const header = activeColumns.map((col) => col.label)
    const rows = filteredData.map((item) =>
      activeColumns.map((col) => col.getValue(item))
    )
    const dateStamp = new Date().toISOString().split("T")[0]
    downloadCsv(`${config.filename}-${dateStamp}.csv`, [header, ...rows])
    setOpen(false)
  }

  const disableExport = selectedColumns.length === 0 || filteredData.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" suppressHydrationWarning>
          <FileText className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {config.filters.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Filters</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {config.filters.map((filter) => {
                  if (filter.type === "text") {
                    return (
                      <div key={filter.id} className="space-y-2">
                        <Label htmlFor={`filter-${filter.id}`}>{filter.label}</Label>
                        <Input
                          id={`filter-${filter.id}`}
                          transform="titleCase"
                          placeholder={filter.placeholder}
                          value={textSelectValues[filter.id] || ""}
                          onChange={(event) =>
                            setTextSelectValues((prev) => ({
                              ...prev,
                              [filter.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    )
                  }
                  if (filter.type === "select") {
                    return (
                      <div key={filter.id} className="space-y-2">
                        <Label>{filter.label}</Label>
                        <Select
                          value={textSelectValues[filter.id] || "all"}
                          onValueChange={(value) =>
                            setTextSelectValues((prev) => ({
                              ...prev,
                              [filter.id]: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={filter.allLabel || "All"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{filter.allLabel || "All"}</SelectItem>
                            {filter.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  }
                  return (
                    <div key={filter.id} className="space-y-2">
                      <Label>{filter.labelFrom}</Label>
                      <Input
                        type="date"
                        value={dateValues[filter.id]?.from || ""}
                        onChange={(event) =>
                          setDateValues((prev) => ({
                            ...prev,
                            [filter.id]: {
                              from: event.target.value,
                              to: prev[filter.id]?.to || "",
                            },
                          }))
                        }
                      />
                      <Label className="mt-2 block">{filter.labelTo}</Label>
                      <Input
                        type="date"
                        value={dateValues[filter.id]?.to || ""}
                        onChange={(event) =>
                          setDateValues((prev) => ({
                            ...prev,
                            [filter.id]: {
                              from: prev[filter.id]?.from || "",
                              to: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Columns</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.columns.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredData.length} rows match filters</span>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Reset selections
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={disableExport}>
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
