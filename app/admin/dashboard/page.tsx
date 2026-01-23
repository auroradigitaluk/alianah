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
import { formatCurrency, formatDonorName, PAYMENT_METHODS, formatPaymentMethod } from "@/lib/utils"
import { Wallet, Globe, Building2, TrendingUp, TrendingDown, Repeat, XCircle } from "lucide-react"

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getDateRange(range: string | null) {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (range) {
    case "7d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      break
    case "30d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      break
    case "90d":
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      startDate.setHours(0, 0, 0, 0)
      break
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case "this_year":
      startDate = new Date(now.getFullYear(), 0, 1)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case "all":
      startDate = new Date(0) // Beginning of time
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      break
    default:
      // Default to 30 days
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
          amountPence: true,
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
      prisma.donation.count({
        where: {
          status: "COMPLETED",
        },
      }),
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
          select: { amountPence: true },
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

    // Calculate total amount for each appeal and extract country from title
    const campaignsWithAmounts = appeals.map((appeal) => {
      const donationsTotal = appeal.donations.reduce((sum, d) => sum + d.amountPence, 0)
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

    // Group all donations by date
    const donationsByDate = new Map<string, number>()

    // Process online donations
    donations.forEach((donation) => {
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
      
      const monthDonations = donations
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
      
      // Count new donors for this day (simplified - using donations as proxy)
      const dayDonations = donations.filter((d) => {
        const dDate = new Date(d.createdAt)
        return dDate.toDateString() === date.toDateString()
      }).length

      weeklyData.push({
        day: dayOfWeek,
        count: dayDonations || 0,
      })
    }

    // Generate income distribution data (using actual data from donations)
    const totalOnline = donations.reduce((sum, d) => sum + d.amountPence, 0) / 100
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
  searchParams: Promise<{ range?: string }>
}) {
  try {
    const params = await searchParams
    const now = new Date()
    
    // Get global date range (applies to all cards, charts, and tables)
    const dateRange = getDateRange(params?.range || "30d")
    const { startDate, endDate } = dateRange
    
    // Calculate previous period for comparison
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const comparisonStartDate = new Date(startDate)
    comparisonStartDate.setDate(comparisonStartDate.getDate() - daysDiff - 1)
    const comparisonEndDate = new Date(startDate)
    comparisonEndDate.setDate(comparisonEndDate.getDate() - 1)
    comparisonEndDate.setHours(23, 59, 59, 999)

    // Get stat card metrics for the selected period (current + previous for comparison)
    const [
      totalOnlineDonations,
      totalOfflineIncome,
      totalCollections,
      totalOnlineDonationsPrev,
      totalOfflineIncomePrev,
      totalCollectionsPrev,
    ] = await Promise.all([
      // Current period: Total Online = WEBSITE_STRIPE + CARD_SUMUP donations
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          paymentMethod: { in: [PAYMENT_METHODS.WEBSITE_STRIPE, PAYMENT_METHODS.CARD_SUMUP, "STRIPE", "CARD"] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Current period: Total Offline = All offline income
      prisma.offlineIncome.aggregate({
        where: {
          receivedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Current period: Total Collections
      prisma.collection.aggregate({
        where: {
          collectedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Previous period: Total Online
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          paymentMethod: { in: ["STRIPE", "CARD"] },
          createdAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Previous period: Total Offline
      prisma.offlineIncome.aggregate({
        where: {
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
          collectedAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
    ])

    // Calculate Total Amount (sum of all three) for current and previous periods
    const totalAmountPence = 
      (totalOnlineDonations._sum.amountPence || 0) +
      (totalOfflineIncome._sum.amountPence || 0) +
      (totalCollections._sum.amountPence || 0)
    
    const totalAmountPencePrev = 
      (totalOnlineDonationsPrev._sum.amountPence || 0) +
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

    // Get payment method data (online, card, cash)
    const [onlineDonations, cardDonations, cashDonations] = await Promise.all([
      // Online = WEBSITE_STRIPE donations
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          paymentMethod: { in: [PAYMENT_METHODS.WEBSITE_STRIPE, "STRIPE"] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Card = CARD_SUMUP donations (SumUp card readers)
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          paymentMethod: { in: [PAYMENT_METHODS.CARD_SUMUP, "CARD"] },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Cash = CASH from offline income and donations
      Promise.all([
        prisma.donation.aggregate({
          where: {
            status: "COMPLETED",
            paymentMethod: PAYMENT_METHODS.CASH,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
        prisma.offlineIncome.aggregate({
          where: {
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

    // Get offline income and collections for the date range
    const [offlineIncomeTotal, collectionsTotal, offlineCashTotal, offlineBankTotal] = await Promise.all([
      prisma.offlineIncome.aggregate({
        where: {
          receivedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      prisma.collection.aggregate({
        where: {
          collectedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      prisma.offlineIncome.aggregate({
        where: {
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
    
    const paymentMethodData = [
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


    // Get donations by day for area chart - split by online vs offline
    // Calculate number of days in range
    const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const maxDays = Math.min(daysInRange, 90) // Limit to 90 days for performance
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

      const [stripeDonations, cardDonations, offlineDonations] = await Promise.all([
        // Online donations (WEBSITE_STRIPE)
        prisma.donation.aggregate({
          where: {
            status: "COMPLETED",
            paymentMethod: { in: [PAYMENT_METHODS.WEBSITE_STRIPE, "STRIPE"] },
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
        // Card donations (CARD_SUMUP - SumUp card readers)
        prisma.donation.aggregate({
          where: {
            status: "COMPLETED",
            paymentMethod: { in: [PAYMENT_METHODS.CARD_SUMUP, "CARD"] },
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
        // Offline donations (CASH from offline income)
        prisma.offlineIncome.aggregate({
          where: {
            source: "CASH",
            receivedAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
      ])

      // Use real payment method data
      const onlineAmount = (stripeDonations._sum.amountPence || 0) + (cardDonations._sum.amountPence || 0)
      const offlineAmount = offlineDonations._sum.amountPence || 0
      
      lineChartData.push({
        date: date.toISOString().split("T")[0],
        desktop: onlineAmount, // Online donations (Stripe + Card)
        mobile: offlineAmount, // Offline donations (Cash)
      })
    }

    // Get top performing campaigns/appeals/projects (all donation targets)
    // 1. Get Appeals
    const appeals = await prisma.appeal.findMany({
      where: { isActive: true },
      include: {
        donations: {
          where: {
            status: "COMPLETED",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { amountPence: true },
        },
        offlineIncome: {
          where: {
            receivedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { amountPence: true },
        },
        collections: {
          where: {
            collectedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { amountPence: true },
        },
      },
    }).catch(() => [])

    // 2. Get Water Projects with their donations
    const waterProjects = await prisma.waterProject.findMany({
      where: { isActive: true },
      include: {
        donations: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { amountPence: true },
        },
      },
    }).catch(() => [])

    // 3. Get Products with their donations
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        donations: {
          where: {
            status: "COMPLETED",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { amountPence: true },
        },
      },
    }).catch(() => [])

    // Combine all donation targets
    const allCampaigns: Array<{ id: string; name: string; amountPence: number; type: string }> = []

    // Add Appeals
    appeals.forEach((appeal) => {
      const donationsTotal = appeal.donations.reduce((sum, d) => sum + d.amountPence, 0)
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
    waterProjects.forEach((project) => {
      const donationsTotal = project.donations.reduce((sum, d) => sum + d.amountPence, 0)
      
      if (donationsTotal > 0) {
        const projectTypeLabels: Record<string, string> = {
          WATER_PUMP: "Water Pump",
          WATER_WELL: "Water Well",
          WATER_TANK: "Water Tank",
          WUDHU_AREA: "Wudhu Area",
        }
        
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

    // Add Products
    products.forEach((product) => {
      const donationsTotal = product.donations.reduce((sum, d) => sum + d.amountPence, 0)
      
      if (donationsTotal > 0) {
        allCampaigns.push({
          id: product.id,
          name: product.name,
          amountPence: donationsTotal,
          type: "Product",
        })
      }
    })

    // Sort by amount descending and take top 10
    const topProjects = allCampaigns
      .sort((a, b) => b.amountPence - a.amountPence)
      .slice(0, 10)

    // Get latest donations
    const latestDonations = await prisma.donation.findMany({
      take: 5,
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

    // Get top fundraisers for the period
    const topFundraisers = await prisma.fundraiser.findMany({
      where: {
        isActive: true,
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
      select: {
        id: true,
        title: true,
        fundraiserName: true,
        appeal: {
          select: {
            title: true,
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
            amountPence: true,
          },
        },
      },
      take: 5,
    }).catch(() => [])

    const fundraisersWithTotals = topFundraisers.map((fundraiser) => {
      const totalRaised = fundraiser.donations.reduce((sum, d) => sum + d.amountPence, 0)
      return {
        id: fundraiser.id,
        title: fundraiser.title,
        fundraiserName: fundraiser.fundraiserName,
        appealTitle: fundraiser.appeal?.title || "General",
        totalRaised,
      }
    }).sort((a, b) => b.totalRaised - a.totalRaised)

    // Get recent activity (last 30 events for pagination)
    const recentActivity: Array<{ type: string; message: string; timestamp: Date }> = []
    
    // Get recent donations
    const recentDonations = await prisma.donation.findMany({
      take: 20,
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

    recentDonations.forEach((donation) => {
      recentActivity.push({
        type: "donation",
        message: `Online donation received: ${formatCurrency(donation.amountPence)} from ${donation.donor.firstName} ${donation.donor.lastName}`,
        timestamp: donation.createdAt,
      })
    })

    // Get recent offline income
    const recentOffline = await prisma.offlineIncome.findMany({
      take: 20,
      orderBy: { receivedAt: "desc" },
      where: {
        receivedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }).catch(() => [])

    recentOffline.forEach((income) => {
      recentActivity.push({
        type: "offline",
        message: `Offline income added: ${formatCurrency(income.amountPence)} (${income.source})`,
        timestamp: income.receivedAt,
      })
    })

    // Get recent collections
    const recentCollections = await prisma.collection.findMany({
      take: 20,
      orderBy: { collectedAt: "desc" },
      where: {
        collectedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }).catch(() => [])

    recentCollections.forEach((collection) => {
      recentActivity.push({
        type: "collection",
        message: `Collection logged: ${formatCurrency(collection.amountPence)}`,
        timestamp: collection.collectedAt,
      })
    })

    // Get recent fundraisers
    const recentFundraisers = await prisma.fundraiser.findMany({
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
      },
    }).catch(() => [])

    recentFundraisers.forEach((fundraiser) => {
      recentActivity.push({
        type: "fundraiser",
        message: `Fundraiser created: ${fundraiser.title} for ${fundraiser.appeal?.title || "General"}`,
        timestamp: fundraiser.createdAt,
      })
    })

    // Sort by timestamp (newest first)
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Get context label for the selected period
    const getPeriodLabel = () => {
      const range = params?.range || "30d"
      switch (range) {
        case "7d":
          return "Last 7 days"
        case "30d":
          return "Last 30 days"
        case "90d":
          return "Last 90 days"
        case "this_month":
          return "This month"
        case "last_month":
          return "Last month"
        case "this_year":
          return "This year"
        case "all":
          return "All time"
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
            <div className="flex flex-col gap-4 py-4 md:gap-4 sm:gap-6 md:py-6">
              {/* Top Row: 4 Metric Cards in 2x2 Grid */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Total Amount */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
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
                          No income recorded
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

                  {/* Total Online */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
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

                  {/* Total Offline */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/5 via-card to-card border-purple-500/20">
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
                  <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/5 via-card to-card border-orange-500/20">
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

              {/* Recurring Donations Summary */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                  {/* Active Recurring */}
                  <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/5 via-card to-card border-green-500/20">
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
                  <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/5 via-card to-card border-blue-500/20">
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
                  <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500/5 via-card to-card border-orange-500/20">
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

              {/* Second Row: Pie Chart and Top Performing Projects Table Side by Side */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-10">
                  <div className="md:col-span-4 flex w-full">
                    <div className="w-full">
                      <ChartPieSimple data={paymentMethodData} />
                    </div>
                  </div>
                  <div className="md:col-span-6 flex w-full">
                    <Card className="flex flex-col w-full">
                      <CardHeader>
                        <CardTitle>Top Campaigns & Appeals</CardTitle>
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

              {/* Third Row: Donations Over Time Chart */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground px-1">{periodLabel}</p>
                  {lineChartData.length > 0 ? (
                    <ChartAreaInteractive data={lineChartData} />
                  ) : (
                    <Card>
                      <CardContent className="py-8">
                        <p className="text-sm text-muted-foreground text-center">No donation data for this period</p>
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
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-10">
                  <div className="md:col-span-4 flex w-full">
                    <div className="w-full">
                      <ChartPieSimple data={paymentMethodData} />
                    </div>
                  </div>
                  <div className="md:col-span-6 flex w-full">
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

              {/* Third Row: Donations Over Time Chart */}
            </div>
          </div>
        </div>
      </>
    )
  }
}
