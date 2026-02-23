import { AdminHeader } from "@/components/admin-header"
import { ChartPieSimple } from "@/components/chart-pie-simple"
import { ChartAreaInteractive } from "@/components/chart-area-interactive-shadcn"
import { TopCampaignsTable } from "@/components/top-campaigns-table"
import { DashboardDateFilter } from "@/components/dashboard-date-filter"
import { RecentActivity } from "@/components/recent-activity"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { prisma } from "@/lib/prisma"
import { getAdminUser } from "@/lib/admin-auth"
import { getDeduplicatedDonationSum, getDeduplicatedDonationCount, sumDonationsDeduplicated, deduplicateDonationsByTransaction } from "@/lib/donation-dedup"
import { formatCurrency, formatDonorName, PAYMENT_METHODS, formatPaymentMethod } from "@/lib/utils"
import { Wallet, Globe, Building2, TrendingUp, TrendingDown, Repeat, XCircle } from "lucide-react"

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getDateRange(
  range: string | null,
  customStart?: string | null,
  customEnd?: string | null
) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  if (range === "custom" && customStart && customEnd) {
    const start = new Date(customStart + "T00:00:00")
    const end = new Date(customEnd + "T23:59:59.999")
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start.getTime() <= end.getTime()) {
      startDate = start
      endDate = end
      return { startDate, endDate }
    }
  }

  switch (range) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    case "yesterday": {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0)
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
      break
    }
    case "30d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case "all":
      startDate = new Date(0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    default:
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
  }

  return { startDate, endDate }
}

async function getDashboardData() {
  try {
    // Get start and end of current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Get date range for last 90 days
    const startDate90d = new Date(now)
    startDate90d.setDate(startDate90d.getDate() - 90)

    const [totalIncome, activeAppeals, collections, donations, offlineIncome, collectionsData, totalDonors, totalDonations, activeFundraisers, recurringDonations] = await Promise.all([
      prisma.offlineIncome.aggregate({
        _sum: { amountPence: true },
      }),
      prisma.appeal.count({
        where: { isActive: true },
      }),
      prisma.collection.aggregate({
        _sum: { amountPence: true },
      }),
      prisma.donation.findMany({
        where: {
          createdAt: { gte: startDate90d },
          status: "COMPLETED",
        },
        select: {
          id: true,
          amountPence: true,
          orderNumber: true,
          transactionId: true,
          createdAt: true,
        },
      }),
      prisma.offlineIncome.findMany({
        where: {
          receivedAt: { gte: startDate90d },
        },
        select: {
          amountPence: true,
          receivedAt: true,
        },
      }),
      prisma.collection.findMany({
        where: {
          collectedAt: { gte: startDate90d },
        },
        select: {
          amountPence: true,
          collectedAt: true,
        },
      }),
      prisma.donor.count(),
      getDeduplicatedDonationCount({ status: "COMPLETED" }),
      prisma.fundraiser.count({
        where: {
          isActive: true,
        },
      }),
      prisma.recurringDonation.count({
        where: {
          status: "ACTIVE",
        },
      }),
    ])

    const donationsDeduped = deduplicateDonationsByTransaction(donations)

    // Get all appeals with their total amounts from donations, offline income, and collections for current month
    const appeals = await prisma.appeal.findMany({
      where: { isActive: true },
      include: {
        donations: {
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: { id: true, amountPence: true, orderNumber: true, transactionId: true },
        },
        offlineIncome: {
          where: {
            receivedAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: { amountPence: true },
        },
        collections: {
          where: {
            collectedAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: { amountPence: true },
        },
      },
    })

    // Calculate total amount for each appeal and extract country from title (one amount per transaction)
    const campaignsWithAmounts = appeals.map((appeal) => {
      const donationsTotal = sumDonationsDeduplicated(appeal.donations)
      const offlineTotal = appeal.offlineIncome.reduce((sum, d) => sum + d.amountPence, 0)
      const collectionsTotal = appeal.collections.reduce((sum, d) => sum + d.amountPence, 0)
      const totalAmount = donationsTotal + offlineTotal + collectionsTotal

      // Extract country from appeal title (e.g., "Palestine Emergency Relief" -> "Palestine")
      // or use a mapping based on known appeals
      let country = "General"
      const title = appeal.title.toLowerCase()
      if (title.includes("palestine")) country = "Palestine"
      else if (title.includes("gaza") || title.includes("egypt")) country = "Egypt/Gaza"
      else if (title.includes("bulgaria")) country = "Bulgaria"
      else if (title.includes("india")) country = "India"
      else if (title.includes("pakistan")) country = "Pakistan"

      return {
        id: appeal.id,
        name: appeal.title,
        country,
        amountPence: totalAmount,
      }
    })

    // Sort by amount descending and take top 6
    const topProjects = campaignsWithAmounts
      .sort((a, b) => b.amountPence - a.amountPence)
      .slice(0, 6)
      .map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        amountPence: campaign.amountPence,
      }))

    // Group all donations by date (one amount per transaction)
    const donationsByDate = new Map<string, number>()
    donationsDeduped.forEach((donation) => {
      const date = new Date(donation.createdAt).toISOString().split("T")[0]
      donationsByDate.set(date, (donationsByDate.get(date) || 0) + donation.amountPence)
    })

    // Process offline income
    offlineIncome.forEach((income) => {
      const date = new Date(income.receivedAt).toISOString().split("T")[0]
      donationsByDate.set(date, (donationsByDate.get(date) || 0) + income.amountPence)
    })

    // Process collections
    collectionsData.forEach((collection) => {
      const date = new Date(collection.collectedAt).toISOString().split("T")[0]
      donationsByDate.set(date, (donationsByDate.get(date) || 0) + collection.amountPence)
    })

    // Convert to array and sort by date
    const chartData = Array.from(donationsByDate.entries())
      .map(([date, amountPence]) => ({
        date,
        amount: amountPence / 100, // Convert pence to pounds
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalOffline = totalIncome._sum.amountPence || 0
    const totalCollections = collections._sum.amountPence || 0
    const totalIncomePence = totalOffline + totalCollections

    // Generate monthly stacked bar chart data (last 3 months)
    const monthlyData = []
    const months = ["Oct", "Nov", "Dec"]
    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthDonations = donationsDeduped
        .filter((d) => {
          const date = new Date(d.createdAt)
          return date >= monthDate && date <= monthEnd
        })
        .reduce((sum, d) => sum + d.amountPence, 0) / 100

      const monthOffline = offlineIncome
        .filter((d) => {
          const date = new Date(d.receivedAt)
          return date >= monthDate && date <= monthEnd
        })
        .reduce((sum, d) => sum + d.amountPence, 0) / 100

      const monthCollections = collectionsData
        .filter((d) => {
          const date = new Date(d.collectedAt)
          return date >= monthDate && date <= monthEnd
        })
        .reduce((sum, d) => sum + d.amountPence, 0) / 100

      monthlyData.push({
        month: months[2 - i],
        online: monthDonations,
        offline: monthOffline,
        collections: monthCollections,
      })
    }

    // Generate weekly subscriber/donor data
    const weeklyData = []
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayOfWeek = days[date.getDay()]
      
      // Count new donors for this day (simplified - using donations as proxy, one per transaction)
      const dayDonations = donationsDeduped.filter((d) => {
        const dDate = new Date(d.createdAt)
        return dDate.toDateString() === date.toDateString()
      }).length

      weeklyData.push({
        day: dayOfWeek,
        count: dayDonations || 0,
      })
    }

    // Generate income distribution data (using actual data from donations, one per transaction)
    const totalOnline = donationsDeduped.reduce((sum, d) => sum + d.amountPence, 0) / 100
    const totalOfflineAmount = offlineIncome.reduce((sum, d) => sum + d.amountPence, 0) / 100
    const totalCollectionsAmount = collectionsData.reduce((sum, d) => sum + d.amountPence, 0) / 100
    
    // Distribution data - simplified for getDashboardData (main function has real payment method breakdown)
    const distributionData = [
      {
        name: "website",
        value: totalOnline,
        label: "Website",
      },
      {
        name: "mobile",
        value: 0,
        label: "Mobile App",
      },
      {
        name: "other",
        value: totalOfflineAmount + totalCollectionsAmount,
        label: "Other",
      },
    ]

    return {
      totalIncomePence,
      activeAppeals,
      topProjects,
      chartData,
      monthlyData,
      weeklyData,
      distributionData,
      totalDonors,
      totalDonations,
      activeFundraisers,
      recurringDonations,
    }
  } catch (error) {
    console.error("Dashboard data error:", error)
    
    // Return empty data on error instead of fake data
    return {
      totalIncomePence: 0,
      activeAppeals: 0,
      topProjects: [],
      chartData: [],
      monthlyData: [],
      weeklyData: [],
      distributionData: [
        { name: "website", value: 0, label: "Website" },
        { name: "mobile", value: 0, label: "Mobile App" },
        { name: "other", value: 0, label: "Other" },
      ],
      totalDonors: 0,
      totalDonations: 0,
      activeFundraisers: 0,
      recurringDonations: 0,
    }
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; start?: string; end?: string }>
}) {
  try {
    const params = await searchParams
    const now = new Date()
    const user = await getAdminUser()
    const isStaff = user?.role === "STAFF"
    const staffId = isStaff ? user!.id : null

    // Get global date range (applies to all cards, charts, and tables)
    const dateRange = getDateRange(
      params?.range || "30d",
      params?.start,
      params?.end
    )
    const { startDate, endDate } = dateRange
    
    // Calculate previous period for comparison
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const comparisonStartDate = new Date(startDate)
    comparisonStartDate.setDate(comparisonStartDate.getDate() - daysDiff - 1)
    const comparisonEndDate = new Date(startDate)
    comparisonEndDate.setDate(comparisonEndDate.getDate() - 1)
    comparisonEndDate.setHours(23, 59, 59, 999)

    // Staff filter: only show data they logged (addedByAdminUserId)
    const staffFilter = staffId ? { addedByAdminUserId: staffId } : {}

    // Get stat card metrics for the selected period (current + previous for comparison)
    const [
      totalOnlineDonations,
      totalOfflineIncome,
      totalCollections,
      totalWaterSponsorDonations,
      totalOnlineDonationsPrev,
      totalOfflineIncomePrev,
      totalCollectionsPrev,
      totalWaterSponsorDonationsPrev,
    ] = await Promise.all([
      // Current period: Total Online = WEBSITE_STRIPE + CARD_SUMUP donations (skip for staff - they don't log these)
      isStaff
        ? Promise.resolve({ _sum: { amountPence: 0 } })
        : getDeduplicatedDonationSum({
            status: "COMPLETED",
            paymentMethod: { in: [PAYMENT_METHODS.WEBSITE_STRIPE, PAYMENT_METHODS.CARD_SUMUP, "STRIPE", "CARD"] },
            createdAt: { gte: startDate, lte: endDate },
          }).then((s) => ({ _sum: { amountPence: s } })).catch(() => ({ _sum: { amountPence: 0 } })),
      // Current period: Total Offline = Offline income (filtered by staff if STAFF)
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          receivedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Current period: Total Collections (filtered by staff if STAFF)
      prisma.collection.aggregate({
        where: {
          ...staffFilter,
          collectedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Current period: Water + Sponsor donations (staff only - what they logged)
      isStaff
        ? Promise.all([
            prisma.waterProjectDonation.aggregate({
              where: {
                addedByAdminUserId: staffId!,
                createdAt: { gte: startDate, lte: endDate },
              },
              _sum: { amountPence: true },
            }).catch(() => ({ _sum: { amountPence: 0 } })),
            prisma.sponsorshipDonation.aggregate({
              where: {
                addedByAdminUserId: staffId!,
                createdAt: { gte: startDate, lte: endDate },
              },
              _sum: { amountPence: true },
            }).catch(() => ({ _sum: { amountPence: 0 } })),
          ]).then(([w, s]) => ({
            _sum: {
              amountPence: (w._sum.amountPence || 0) + (s._sum.amountPence || 0),
            },
          }))
        : Promise.resolve({ _sum: { amountPence: 0 } }),
      // Previous period: Total Online (skip for staff)
      isStaff
        ? Promise.resolve({ _sum: { amountPence: 0 } })
        : getDeduplicatedDonationSum({
            status: "COMPLETED",
            paymentMethod: { in: ["STRIPE", "CARD"] },
            createdAt: { gte: comparisonStartDate, lte: comparisonEndDate },
          }).then((s) => ({ _sum: { amountPence: s } })).catch(() => ({ _sum: { amountPence: 0 } })),
      // Previous period: Total Offline
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          receivedAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Previous period: Total Collections
      prisma.collection.aggregate({
        where: {
          ...staffFilter,
          collectedAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Previous period: Water + Sponsor (staff only)
      isStaff
        ? Promise.all([
            prisma.waterProjectDonation.aggregate({
              where: {
                addedByAdminUserId: staffId!,
                createdAt: { gte: comparisonStartDate, lte: comparisonEndDate },
              },
              _sum: { amountPence: true },
            }).catch(() => ({ _sum: { amountPence: 0 } })),
            prisma.sponsorshipDonation.aggregate({
              where: {
                addedByAdminUserId: staffId!,
                createdAt: { gte: comparisonStartDate, lte: comparisonEndDate },
              },
              _sum: { amountPence: true },
            }).catch(() => ({ _sum: { amountPence: 0 } })),
          ]).then(([w, s]) => ({
            _sum: {
              amountPence: (w._sum.amountPence || 0) + (s._sum.amountPence || 0),
            },
          }))
        : Promise.resolve({ _sum: { amountPence: 0 } }),
    ])

    // Calculate Total Amount for current and previous periods
    // For staff: offline + collections + water + sponsor. For admin: online + offline + collections
    const totalAmountPence = isStaff
      ? (totalOfflineIncome._sum.amountPence || 0) +
        (totalCollections._sum.amountPence || 0) +
        (totalWaterSponsorDonations._sum.amountPence || 0)
      : (totalOnlineDonations._sum.amountPence || 0) +
        (totalOfflineIncome._sum.amountPence || 0) +
        (totalCollections._sum.amountPence || 0)

    const totalAmountPencePrev = isStaff
      ? (totalOfflineIncomePrev._sum.amountPence || 0) +
        (totalCollectionsPrev._sum.amountPence || 0) +
        (totalWaterSponsorDonationsPrev._sum.amountPence || 0)
      : (totalOnlineDonationsPrev._sum.amountPence || 0) +
        (totalOfflineIncomePrev._sum.amountPence || 0) +
        (totalCollectionsPrev._sum.amountPence || 0)

    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const totalAmountChange = calculatePercentageChange(totalAmountPence, totalAmountPencePrev)
    const totalOnlineChange = calculatePercentageChange(
      totalOnlineDonations._sum.amountPence || 0,
      totalOnlineDonationsPrev._sum.amountPence || 0
    )
    const totalOfflineChange = calculatePercentageChange(
      totalOfflineIncome._sum.amountPence || 0,
      totalOfflineIncomePrev._sum.amountPence || 0
    )
    const totalCollectionsChange = calculatePercentageChange(
      totalCollections._sum.amountPence || 0,
      totalCollectionsPrev._sum.amountPence || 0
    )
    const totalWaterSponsorChange = calculatePercentageChange(
      totalWaterSponsorDonations._sum.amountPence || 0,
      totalWaterSponsorDonationsPrev._sum.amountPence || 0
    )

    // Get payment method data (online, card, cash) - for staff, only their manual donations
    const [onlineDonations, cardDonations, cashDonations] = await Promise.all([
      // Online = WEBSITE_STRIPE donations (skip for staff)
      isStaff
        ? Promise.resolve({ _sum: { amountPence: 0 } })
        : getDeduplicatedDonationSum({
            status: "COMPLETED",
            paymentMethod: { in: [PAYMENT_METHODS.WEBSITE_STRIPE, "STRIPE"] },
            createdAt: { gte: startDate, lte: endDate },
          }).then((s) => ({ _sum: { amountPence: s } })).catch(() => ({ _sum: { amountPence: 0 } })),
      // Card = CARD_SUMUP donations (skip for staff)
      isStaff
        ? Promise.resolve({ _sum: { amountPence: 0 } })
        : getDeduplicatedDonationSum({
            status: "COMPLETED",
            paymentMethod: { in: [PAYMENT_METHODS.CARD_SUMUP, "CARD"] },
            createdAt: { gte: startDate, lte: endDate },
          }).then((s) => ({ _sum: { amountPence: s } })).catch(() => ({ _sum: { amountPence: 0 } })),
      // Cash = CASH from offline income and donations (for staff: only their offline)
      Promise.all([
        isStaff
          ? Promise.resolve({ _sum: { amountPence: 0 } })
          : getDeduplicatedDonationSum({
              status: "COMPLETED",
              paymentMethod: PAYMENT_METHODS.CASH,
              createdAt: { gte: startDate, lte: endDate },
            }).then((s) => ({ _sum: { amountPence: s } })).catch(() => ({ _sum: { amountPence: 0 } })),
        prisma.offlineIncome.aggregate({
          where: {
            ...staffFilter,
            source: "CASH",
            receivedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
      ]).then(([donations, offline]) => ({
        _sum: { amountPence: (donations._sum.amountPence || 0) + (offline._sum.amountPence || 0) },
      })),
    ])

    // Get offline income and collections for the date range (filtered by staff if STAFF)
    const [offlineIncomeTotal, collectionsTotal, offlineCashTotal, offlineBankTotal] = await Promise.all([
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          receivedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      prisma.collection.aggregate({
        where: {
          ...staffFilter,
          collectedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          source: "CASH",
          receivedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      prisma.offlineIncome.aggregate({
        where: {
          ...staffFilter,
          source: "BANK_TRANSFER",
          receivedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
    ])
    
    // Calculate real distribution based on actual payment methods
    const onlineAmount = (onlineDonations._sum.amountPence || 0) / 100
    const cardAmount = (cardDonations._sum.amountPence || 0) / 100
    const cashAmount = (cashDonations._sum.amountPence || 0) / 100
    const totalOfflineAmount = (offlineIncomeTotal._sum.amountPence || 0) / 100
    const totalCollectionsAmount = (collectionsTotal._sum.amountPence || 0) / 100
    
    const paymentMethodData = isStaff
      ? [
          {
            name: "cash",
            value: offlineCashTotal._sum.amountPence || 0,
            label: formatPaymentMethod(PAYMENT_METHODS.CASH),
          },
          {
            name: "bank_transfer",
            value: offlineBankTotal._sum.amountPence || 0,
            label: formatPaymentMethod(PAYMENT_METHODS.BANK_TRANSFER),
          },
          {
            name: "collections",
            value: collectionsTotal._sum.amountPence || 0,
            label: "Collections (Masjid)",
          },
          {
            name: "water_sponsor",
            value: totalWaterSponsorDonations._sum.amountPence || 0,
            label: "Water & Sponsor",
          },
        ]
      : [
          {
            name: "website_stripe",
            value: onlineDonations._sum.amountPence || 0,
            label: formatPaymentMethod(PAYMENT_METHODS.WEBSITE_STRIPE),
          },
          {
            name: "card_sumup",
            value: cardDonations._sum.amountPence || 0,
            label: formatPaymentMethod(PAYMENT_METHODS.CARD_SUMUP),
          },
          {
            name: "cash",
            value: cashDonations._sum.amountPence || 0,
            label: formatPaymentMethod(PAYMENT_METHODS.CASH),
          },
          {
            name: "bank_transfer",
            value: offlineBankTotal._sum.amountPence || 0,
            label: formatPaymentMethod(PAYMENT_METHODS.BANK_TRANSFER),
          },
          {
            name: "collections",
            value: collectionsTotal._sum.amountPence || 0,
            label: "Collections (Masjid)",
          },
        ]
    
    // Update distribution data with real payment method data
    const distributionData = [
      {
        name: "website_stripe",
        value: onlineAmount,
        label: formatPaymentMethod(PAYMENT_METHODS.WEBSITE_STRIPE),
      },
      {
        name: "card_sumup",
        value: cardAmount,
        label: formatPaymentMethod(PAYMENT_METHODS.CARD_SUMUP),
      },
      {
        name: "cash",
        value: cashAmount + totalOfflineAmount + totalCollectionsAmount,
        label: formatPaymentMethod(PAYMENT_METHODS.CASH),
      },
    ]

    // Ensure we're using the correct data sources strictly:
    // Website (Stripe) = WEBSITE_STRIPE donations only
    // Card (SumUp) = CARD_SUMUP donations only  
    // Cash = CASH from donations and offline income


    // Get donations by day for area chart - split by online vs offline (one amount per transaction)
    const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const maxDays = Math.min(daysInRange, 90) // Limit to 90 days for performance
    const chartDonationsDeduped = isStaff
      ? []
      : deduplicateDonationsByTransaction(
          await prisma.donation.findMany({
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate },
            },
            select: { id: true, amountPence: true, orderNumber: true, transactionId: true, createdAt: true, paymentMethod: true },
          }).catch(() => [])
        )
    const lineChartData = []
    for (let day = maxDays - 1; day >= 0; day--) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + day)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      
      // Skip if outside the selected range
      if (dayStart < startDate || dayEnd > endDate) continue

      const stripeSum = isStaff ? 0 : chartDonationsDeduped.filter((d) => {
        const t = new Date(d.createdAt).getTime()
        return t >= dayStart.getTime() && t <= dayEnd.getTime() && [PAYMENT_METHODS.WEBSITE_STRIPE, "STRIPE"].includes(d.paymentMethod)
      }).reduce((s, d) => s + d.amountPence, 0)
      const cardSum = isStaff ? 0 : chartDonationsDeduped.filter((d) => {
        const t = new Date(d.createdAt).getTime()
        return t >= dayStart.getTime() && t <= dayEnd.getTime() && [PAYMENT_METHODS.CARD_SUMUP, "CARD"].includes(d.paymentMethod)
      }).reduce((s, d) => s + d.amountPence, 0)

      const [stripeDonations, cardDonations, offlineDonations, dayCollections, dayWater, daySponsor] = await Promise.all([
        Promise.resolve({ _sum: { amountPence: stripeSum } }),
        Promise.resolve({ _sum: { amountPence: cardSum } }),
        // Offline income (filtered by staff)
        prisma.offlineIncome.aggregate({
          where: {
            ...staffFilter,
            receivedAt: { gte: dayStart, lte: dayEnd },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
        // Collections (filtered by staff)
        prisma.collection.aggregate({
          where: {
            ...staffFilter,
            collectedAt: { gte: dayStart, lte: dayEnd },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
        // Water donations (staff only)
        isStaff
          ? prisma.waterProjectDonation.aggregate({
              where: {
                addedByAdminUserId: staffId!,
                createdAt: { gte: dayStart, lte: dayEnd },
              },
              _sum: { amountPence: true },
            }).catch(() => ({ _sum: { amountPence: 0 } }))
          : Promise.resolve({ _sum: { amountPence: 0 } }),
        // Sponsor donations (staff only)
        isStaff
          ? prisma.sponsorshipDonation.aggregate({
              where: {
                addedByAdminUserId: staffId!,
                createdAt: { gte: dayStart, lte: dayEnd },
              },
              _sum: { amountPence: true },
            }).catch(() => ({ _sum: { amountPence: 0 } }))
          : Promise.resolve({ _sum: { amountPence: 0 } }),
      ])

      // For staff: desktop=online (0), mobile=offline+collections+water+sponsor. For admin: desktop=online, mobile=offline
      const onlineAmount = (stripeDonations._sum.amountPence || 0) + (cardDonations._sum.amountPence || 0)
      const offlineAmount = isStaff
        ? (offlineDonations._sum.amountPence || 0) +
          (dayCollections._sum.amountPence || 0) +
          (dayWater._sum.amountPence || 0) +
          (daySponsor._sum.amountPence || 0)
        : offlineDonations._sum.amountPence || 0
      
      lineChartData.push({
        date: date.toISOString().split("T")[0],
        desktop: onlineAmount, // Online donations (Stripe + Card)
        mobile: offlineAmount, // Offline donations (Cash)
      })
    }

    // Get top performing campaigns/appeals/projects
    // For staff: only water and sponsor projects (with donations they logged)
    // For admin: appeals + water + sponsor
    const donationDateFilter = {
      createdAt: { gte: startDate, lte: endDate },
      ...(staffId ? { addedByAdminUserId: staffId } : {}),
    }

    const [appeals, waterProjects, sponsorshipProjects] = await Promise.all([
      isStaff
        ? Promise.resolve([])
        : prisma.appeal.findMany({
            where: { isActive: true },
            include: {
              donations: {
                where: {
                  status: "COMPLETED",
                  createdAt: { gte: startDate, lte: endDate },
                },
                select: { id: true, amountPence: true, orderNumber: true, transactionId: true },
              },
              offlineIncome: {
                where: {
                  receivedAt: { gte: startDate, lte: endDate },
                },
                select: { amountPence: true },
              },
              collections: {
                where: {
                  collectedAt: { gte: startDate, lte: endDate },
                },
                select: { amountPence: true },
              },
            },
          }).catch(() => []),
      prisma.waterProject.findMany({
        where: { isActive: true },
        include: {
          donations: {
            where: donationDateFilter,
            select: { amountPence: true },
          },
        },
      }).catch(() => []),
      prisma.sponsorshipProject.findMany({
        where: { isActive: true },
        include: {
          donations: {
            where: donationDateFilter,
            select: { amountPence: true },
          },
        },
      }).catch(() => []),
    ])

    // Sponsorship report pools with fewer than 10 available reports (for admin notification)
    let lowReportPools: { projectType: string; available: number }[] = []
    if (!isStaff) {
      try {
        const [totalByProject, availableByProject] = await Promise.all([
          prisma.sponsorshipReportPool.groupBy({
            by: ["sponsorshipProjectId"],
            _count: { id: true },
          }),
          prisma.sponsorshipReportPool.groupBy({
            by: ["sponsorshipProjectId"],
            _count: { id: true },
            where: { assignedDonationId: null, assignedRecurringRef: null },
          }),
        ])
        const availableMap = new Map(availableByProject.map((a) => [a.sponsorshipProjectId, a._count.id]))
        const lowProjectIds = totalByProject
          .filter((t) => (availableMap.get(t.sponsorshipProjectId) ?? 0) < 10)
          .map((t) => t.sponsorshipProjectId)
        if (lowProjectIds.length > 0) {
          const projects = await prisma.sponsorshipProject.findMany({
            where: { id: { in: lowProjectIds } },
            select: { id: true, projectType: true },
          })
          const projectTypeLabels: Record<string, string> = {
            ORPHANS: "Orphans",
            HIFZ: "Hifz",
            FAMILIES: "Families",
          }
          lowReportPools = projects.map((p) => ({
            projectType: projectTypeLabels[p.projectType] || p.projectType,
            available: availableMap.get(p.id) ?? 0,
          }))
        }
      } catch {
        // ignore
      }
    }

    const allCampaigns: Array<{ id: string; name: string; amountPence: number; type: string }> = []

    // Add Appeals (admin only) — one amount per transaction
    appeals.forEach((appeal) => {
      const donationsTotal = sumDonationsDeduplicated(appeal.donations)
      const offlineTotal = appeal.offlineIncome.reduce((sum, d) => sum + d.amountPence, 0)
      const collectionsTotal = appeal.collections.reduce((sum, d) => sum + d.amountPence, 0)
      const totalAmount = donationsTotal + offlineTotal + collectionsTotal
      if (totalAmount > 0) {
        allCampaigns.push({
          id: appeal.id,
          name: appeal.title,
          amountPence: totalAmount,
          type: "Appeal",
        })
      }
    })

    // Add Water Projects
    const projectTypeLabels: Record<string, string> = {
      WATER_PUMP: "Water Pump",
      WATER_WELL: "Water Well",
      WATER_TANK: "Water Tank",
      WUDHU_AREA: "Wudhu Area",
      ORPHANS: "Orphans",
      HIFZ: "Hifz",
      FAMILIES: "Families",
    }
    waterProjects.forEach((project) => {
      const donationsTotal = project.donations.reduce((sum, d) => sum + d.amountPence, 0)
      if (donationsTotal > 0) {
        allCampaigns.push({
          id: project.id,
          name: project.location
            ? `${projectTypeLabels[project.projectType] || project.projectType} - ${project.location}`
            : projectTypeLabels[project.projectType] || project.projectType,
          amountPence: donationsTotal,
          type: "Water Project",
        })
      }
    })

    // Add Sponsorship Projects
    sponsorshipProjects.forEach((project) => {
      const donationsTotal = project.donations.reduce((sum, d) => sum + d.amountPence, 0)
      if (donationsTotal > 0) {
        allCampaigns.push({
          id: project.id,
          name: projectTypeLabels[project.projectType] || project.projectType,
          amountPence: donationsTotal,
          type: "Sponsorship Project",
        })
      }
    })

    // Sort by amount descending and take top 10
    const topProjects = allCampaigns
      .sort((a, b) => b.amountPence - a.amountPence)
      .slice(0, 10)

    // Get latest donations (one row per transaction)
    const latestDonationsRaw = await prisma.donation.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        donor: {
          select: {
            title: true,
            firstName: true,
            lastName: true,
          },
        },
        appeal: {
          select: {
            title: true,
          },
        },
      },
    }).catch(() => [])
    const latestDonations = deduplicateDonationsByTransaction(latestDonationsRaw).slice(0, 5)

    // Get recurring donations summary
    const [activeRecurring, cancelledRecurringThisPeriod, recurringMonthlyTotal] = await Promise.all([
      prisma.recurringDonation.count({
        where: {
          status: "ACTIVE",
        },
      }).catch(() => 0),
      prisma.recurringDonation.count({
        where: {
          status: "CANCELLED",
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }).catch(() => 0),
      prisma.recurringDonation.aggregate({
        where: {
          status: "ACTIVE",
          frequency: "MONTHLY",
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
    ])

    // Get top fundraisers for the period (admin only - staff don't see fundraisers)
    const topFundraisers = isStaff
      ? []
      : await prisma.fundraiser.findMany({
      where: {
        isActive: true,
        OR: [
          {
            donations: {
              some: {
                status: "COMPLETED",
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
          {
            waterProjectDonations: {
              some: {
                status: {
                  in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"],
                },
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        fundraiserName: true,
        consolidatedWaterProjectDonationId: true,
        appeal: {
          select: {
            title: true,
          },
        },
        waterProject: {
          select: {
            projectType: true,
          },
        },
        donations: {
          where: {
            status: "COMPLETED",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            amountPence: true,
            orderNumber: true,
            transactionId: true,
          },
        },
        waterProjectDonations: {
          where: {
            status: {
              in: ["WAITING_TO_REVIEW", "ORDERED", "COMPLETE"],
            },
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            amountPence: true,
          },
        },
      },
      take: 5,
    }).catch(() => [])

    const fundraisersWithTotals = topFundraisers
      .map((fundraiser) => {
        const isWater = Boolean(fundraiser.waterProject)
        const legacyWaterSum =
          isWater && fundraiser.waterProjectDonations
            ? fundraiser.waterProjectDonations
                .filter((d) => d.id !== fundraiser.consolidatedWaterProjectDonationId)
                .reduce((sum, d) => sum + d.amountPence, 0)
            : 0
        const totalRaised =
          sumDonationsDeduplicated(fundraiser.donations) +
          legacyWaterSum
        const appealTitle = fundraiser.appeal?.title
          ? fundraiser.appeal.title
          : fundraiser.waterProject?.projectType === "WATER_PUMP"
            ? "Water Pumps"
            : fundraiser.waterProject?.projectType === "WATER_WELL"
              ? "Water Wells"
              : fundraiser.waterProject?.projectType === "WATER_TANK"
                ? "Water Tanks"
                : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                  ? "Wudhu Areas"
                  : "Water Project"
        return {
          id: fundraiser.id,
          title: fundraiser.title,
          fundraiserName: fundraiser.fundraiserName,
          appealTitle,
          totalRaised,
        }
      })
      .sort((a, b) => b.totalRaised - a.totalRaised)

    // Get recent activity (filtered by staff if STAFF)
    const recentActivity: Array<{ type: string; message: string; timestamp: Date }> = []

    // Get recent online donations (admin only) — one row per transaction
    const recentDonationsRaw = isStaff
      ? []
      : await prisma.donation.findMany({
          take: 40,
          orderBy: { createdAt: "desc" },
          where: {
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
          },
          include: {
            donor: { select: { firstName: true, lastName: true } },
            appeal: { select: { title: true } },
          },
        }).catch(() => [])
    const recentDonations = deduplicateDonationsByTransaction(recentDonationsRaw).slice(0, 20)

    recentDonations.forEach((donation) => {
      recentActivity.push({
        type: "donation",
        message: `Online donation received: ${formatCurrency(donation.amountPence)} from ${donation.donor.firstName} ${donation.donor.lastName}`,
        timestamp: donation.createdAt,
      })
    })

    // Get recent offline income (filtered by staff)
    const recentOffline = await prisma.offlineIncome.findMany({
      take: 20,
      orderBy: { receivedAt: "desc" },
      where: {
        ...staffFilter,
        receivedAt: { gte: startDate, lte: endDate },
      },
    }).catch(() => [])

    recentOffline.forEach((income) => {
      recentActivity.push({
        type: "offline",
        message: `Offline income added: ${formatCurrency(income.amountPence)} (${income.source})`,
        timestamp: income.receivedAt,
      })
    })

    // Get recent collections (filtered by staff)
    const recentCollections = await prisma.collection.findMany({
      take: 20,
      orderBy: { collectedAt: "desc" },
      where: {
        ...staffFilter,
        collectedAt: { gte: startDate, lte: endDate },
      },
    }).catch(() => [])

    recentCollections.forEach((collection) => {
      recentActivity.push({
        type: "collection",
        message: `Collection logged: ${formatCurrency(collection.amountPence)}`,
        timestamp: collection.collectedAt,
      })
    })

    // Get recent collection bookings (filtered by staff)
    const recentBookings = await prisma.collectionBooking.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      where: {
        ...staffFilter,
        createdAt: { gte: startDate, lte: endDate },
      },
    }).catch(() => [])

    recentBookings.forEach((booking) => {
      const location = [booking.locationName, booking.city].filter(Boolean).join(", ") || booking.locationName
      recentActivity.push({
        type: "booking",
        message: `Booking added: ${location}`,
        timestamp: booking.createdAt,
      })
    })

    // Get recent water & sponsor donations (staff only)
    if (isStaff && staffId) {
      const [recentWater, recentSponsor] = await Promise.all([
        prisma.waterProjectDonation.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          where: {
            addedByAdminUserId: staffId,
            createdAt: { gte: startDate, lte: endDate },
          },
          include: { waterProject: { select: { projectType: true } } },
        }).catch(() => []),
        prisma.sponsorshipDonation.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          where: {
            addedByAdminUserId: staffId,
            createdAt: { gte: startDate, lte: endDate },
          },
          include: { sponsorshipProject: { select: { projectType: true } } },
        }).catch(() => []),
      ])
      recentWater.forEach((d) => {
        recentActivity.push({
          type: "water",
          message: `Water donation logged: ${formatCurrency(d.amountPence)} (${projectTypeLabels[d.waterProject.projectType] || d.waterProject.projectType})`,
          timestamp: d.createdAt,
        })
      })
      recentSponsor.forEach((d) => {
        recentActivity.push({
          type: "sponsor",
          message: `Sponsor donation logged: ${formatCurrency(d.amountPence)} (${projectTypeLabels[d.sponsorshipProject.projectType] || d.sponsorshipProject.projectType})`,
          timestamp: d.createdAt,
        })
      })
    }

    // Get recent fundraisers (admin only)
    const recentFundraisers = isStaff
      ? []
      : await prisma.fundraiser.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        appeal: {
          select: {
            title: true,
          },
        },
        waterProject: {
          select: {
            projectType: true,
          },
        },
      },
    }).catch(() => [])

    recentFundraisers.forEach((fundraiser) => {
      const campaignTitle = fundraiser.appeal?.title
        ? fundraiser.appeal.title
        : fundraiser.waterProject?.projectType === "WATER_PUMP"
          ? "Water Pumps"
          : fundraiser.waterProject?.projectType === "WATER_WELL"
            ? "Water Wells"
            : fundraiser.waterProject?.projectType === "WATER_TANK"
              ? "Water Tanks"
              : fundraiser.waterProject?.projectType === "WUDHU_AREA"
                ? "Wudhu Areas"
                : "Water Project"
      recentActivity.push({
        type: "fundraiser",
        message: `Fundraiser created: ${fundraiser.title} for ${campaignTitle}`,
        timestamp: fundraiser.createdAt,
      })
    })

    // Sort by timestamp (newest first)
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Get context label for the selected period
    const getPeriodLabel = () => {
      const range = params?.range || "30d"
      if (range === "custom" && params?.start && params?.end) {
        try {
          const from = new Date(params.start + "T00:00:00")
          const to = new Date(params.end + "T00:00:00")
          if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
            const fmt = (d: Date) =>
              d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            return `${fmt(from)} – ${fmt(to)}`
          }
        } catch {
          // fall through
        }
        return "Custom range"
      }
      switch (range) {
        case "today":
          return "Today"
        case "yesterday":
          return "Yesterday"
        case "30d":
          return "Last 30 days"
        case "this_month":
          return "This month"
        case "this_year":
          return "This year"
        case "all":
          return "All time"
        case "custom":
          return "Custom range"
        default:
          return "Selected period"
      }
    }

    const periodLabel = getPeriodLabel()

    return (
      <>
        <AdminHeader title="Dashboard" dateFilter={<DashboardDateFilter />} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {lowReportPools.length > 0 && (
              <div className="mx-2 mt-2 sm:mx-4 lg:mx-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">
                  Low report pool: fewer than 10 reports available for{" "}
                  {lowReportPools.map((p) => `${p.projectType} (${p.available} left)`).join(", ")}.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Upload more PDFs in{" "}
                  <a href="/admin/sponsorships" className="text-primary hover:underline font-medium">
                    Sponsorships
                  </a>{" "}
                  → open a project → Reports tab.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
              {/* Top Row: 4 Metric Cards in 2x2 Grid */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Total Amount */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-card border-primary/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Wallet className="h-4 w-4 text-primary" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{formatCurrency(totalAmountPence)}</div>
                      {totalAmountPence === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {isStaff ? "No donations logged yet" : "No income recorded"}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          vs previous period{" "}
                          {totalAmountChange >= 0 ? (
                            <span className="text-green-600 flex items-center gap-0.5 font-medium">
                              <TrendingUp className="h-3 w-3" />
                              {Math.abs(totalAmountChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-0.5 font-medium">
                              <TrendingDown className="h-3 w-3" />
                              {Math.abs(totalAmountChange).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Total Online - admin only */}
                  {!isStaff && (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-card border-blue-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Total Online</CardTitle>
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{formatCurrency(totalOnlineDonations._sum.amountPence || 0)}</div>
                      {(totalOnlineDonations._sum.amountPence || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          No online donations
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          vs previous period{" "}
                          {totalOnlineChange >= 0 ? (
                            <span className="text-green-600 flex items-center gap-0.5 font-medium">
                              <TrendingUp className="h-3 w-3" />
                              {Math.abs(totalOnlineChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-0.5 font-medium">
                              <TrendingDown className="h-3 w-3" />
                              {Math.abs(totalOnlineChange).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  )}

                  {/* Water & Sponsor - staff only (replaces Total Online) */}
                  {isStaff && (
                  <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-card border-cyan-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Water & Sponsor</CardTitle>
                      <div className="rounded-lg bg-cyan-500/10 p-2">
                        <Globe className="h-4 w-4 text-cyan-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{formatCurrency(totalWaterSponsorDonations._sum.amountPence || 0)}</div>
                      {(totalWaterSponsorDonations._sum.amountPence || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          No water or sponsor donations logged
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          vs previous period{" "}
                          {totalWaterSponsorChange >= 0 ? (
                            <span className="text-green-600 flex items-center gap-0.5 font-medium">
                              <TrendingUp className="h-3 w-3" />
                              {Math.abs(totalWaterSponsorChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-0.5 font-medium">
                              <TrendingDown className="h-3 w-3" />
                              {Math.abs(totalWaterSponsorChange).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  )}

                  {/* Total Offline */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-card border-purple-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Total Offline</CardTitle>
                      <div className="rounded-lg bg-purple-500/10 p-2">
                        <Wallet className="h-4 w-4 text-purple-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{formatCurrency(totalOfflineIncome._sum.amountPence || 0)}</div>
                      {(totalOfflineIncome._sum.amountPence || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          No offline income logged
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          vs previous period{" "}
                          {totalOfflineChange >= 0 ? (
                            <span className="text-green-600 flex items-center gap-0.5 font-medium">
                              <TrendingUp className="h-3 w-3" />
                              {Math.abs(totalOfflineChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-0.5 font-medium">
                              <TrendingDown className="h-3 w-3" />
                              {Math.abs(totalOfflineChange).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Total Collections */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-card border-orange-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                      <div className="rounded-lg bg-orange-500/10 p-2">
                        <Building2 className="h-4 w-4 text-orange-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{formatCurrency(totalCollections._sum.amountPence || 0)}</div>
                      {(totalCollections._sum.amountPence || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          No collections recorded yet
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          vs previous period{" "}
                          {totalCollectionsChange >= 0 ? (
                            <span className="text-green-600 flex items-center gap-0.5 font-medium">
                              <TrendingUp className="h-3 w-3" />
                              {Math.abs(totalCollectionsChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-0.5 font-medium">
                              <TrendingDown className="h-3 w-3" />
                              {Math.abs(totalCollectionsChange).toFixed(1)}%
                            </span>
                          )}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Recurring Donations Summary - admin only */}
              {!isStaff && (
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                  {/* Active Recurring */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/10 via-green-500/5 to-card border-green-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Active Recurring</CardTitle>
                      <div className="rounded-lg bg-green-500/10 p-2">
                        <Repeat className="h-4 w-4 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{activeRecurring}</div>
                      {activeRecurring === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          No active recurring donations
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Active subscriptions
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Monthly Total */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-card border-blue-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <Wallet className="h-4 w-4 text-blue-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{formatCurrency(recurringMonthlyTotal._sum.amountPence || 0)}</div>
                      {(recurringMonthlyTotal._sum.amountPence || 0) === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          No monthly recurring income
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Per month
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cancelled */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-card border-orange-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                      <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
                      <div className="rounded-lg bg-orange-500/10 p-2">
                        <XCircle className="h-4 w-4 text-orange-600" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <div className="text-2xl font-bold">{cancelledRecurringThisPeriod}</div>
                      {cancelledRecurringThisPeriod === 0 ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          No cancellations ({periodLabel})
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                          Cancelled ({periodLabel})
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              )}

              {/* Second Row: Pie Chart and Top Performing Projects Table Side by Side */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="flex w-full">
                    <div className="w-full">
                      <ChartPieSimple data={paymentMethodData} />
                    </div>
                  </div>
                  <div className="flex w-full">
                    <Card className="flex flex-col w-full">
                      <CardHeader>
                        <CardTitle>{isStaff ? "Water & Sponsor Projects" : "Top Campaigns & Appeals"}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {topProjects.length > 0 ? (
                          <TopCampaignsTable campaigns={topProjects} />
                        ) : (
                          <p className="text-sm text-muted-foreground">No campaigns with donations in this period</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Recent Activity and Top Fundraisers */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className={`grid gap-3 sm:gap-4 ${isStaff ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
                  {/* Recent Activity */}
                  <RecentActivity activities={recentActivity} />

                  {/* Top Fundraisers - admin only */}
                  {!isStaff && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Fundraisers ({periodLabel})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {fundraisersWithTotals.length > 0 ? (
                        <div className="space-y-3">
                          {fundraisersWithTotals.map((fundraiser) => (
                            <div key={fundraiser.id} className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{fundraiser.fundraiserName}</p>
                                <p className="text-xs text-muted-foreground">{fundraiser.appealTitle}</p>
                              </div>
                              <p className="font-semibold text-sm">{formatCurrency(fundraiser.totalRaised)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No fundraisers created</p>
                      )}
                    </CardContent>
                  </Card>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </>
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    
    // Return empty data on error instead of fake data
    const paymentMethodData = [
      {
        name: "website_stripe",
        value: 0,
        label: formatPaymentMethod(PAYMENT_METHODS.WEBSITE_STRIPE),
      },
      {
        name: "card_sumup",
        value: 0,
        label: formatPaymentMethod(PAYMENT_METHODS.CARD_SUMUP),
      },
      {
        name: "cash",
        value: 0,
        label: formatPaymentMethod(PAYMENT_METHODS.CASH),
      },
      {
        name: "bank_transfer",
        value: 0,
        label: formatPaymentMethod(PAYMENT_METHODS.BANK_TRANSFER),
      },
      {
        name: "collections",
        value: 0,
        label: "Collections (Masjid)",
      },
    ]

    const lineChartData: Array<{ date: string; desktop: number; mobile: number }> = []
    const topProjects: Array<{ id: string; name: string; amountPence: number; type?: string }> = []
    const recentActivity: Array<{ type: string; message: string; timestamp: Date }> = []
    const fundraisersWithTotals: Array<{ id: string; title: string; fundraiserName: string; appealTitle: string; totalRaised: number }> = []
    const activeRecurring = 0
    const cancelledRecurringThisPeriod = 0
    const recurringMonthlyTotal = { _sum: { amountPence: 0 } }
    const periodLabel = "Selected period"

    return (
      <>
        <AdminHeader title="Dashboard" dateFilter={<DashboardDateFilter />} />
        <div className="flex flex-1 flex-col bg-gradient-to-b from-background via-background to-muted/20">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
              {/* Top Row: 4 Metric Cards in 2x2 Grid */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Total Amount */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No income recorded
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Online */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Online</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No income recorded
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Offline */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Offline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No income recorded
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Collections */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No income recorded
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Second Row: Pie Chart and Top Performing Projects Table Side by Side */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                  <div className="flex w-full">
                    <div className="w-full">
                      <ChartPieSimple data={paymentMethodData} />
                    </div>
                  </div>
                  <div className="flex w-full">
                    <Card className="flex flex-col w-full">
                      <CardHeader>
                        <CardTitle>Top Campaigns & Appeals</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <TopCampaignsTable campaigns={topProjects} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Recent Activity and Top Fundraisers */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                  {/* Recent Activity */}
                  <RecentActivity activities={recentActivity} />

                  {/* Top Fundraisers */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Fundraisers ({periodLabel})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {fundraisersWithTotals.length > 0 ? (
                        <div className="space-y-3">
                          {fundraisersWithTotals.map((fundraiser) => (
                            <div key={fundraiser.id} className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{fundraiser.fundraiserName}</p>
                                <p className="text-xs text-muted-foreground">{fundraiser.appealTitle}</p>
                              </div>
                              <p className="font-semibold text-sm">{formatCurrency(fundraiser.totalRaised)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No fundraisers created</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

            </div>
          </div>
        </div>
      </>
    )
  }
}
