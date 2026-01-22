import { AdminHeader } from "@/components/admin-header"
import { ChartPieSimple } from "@/components/chart-pie-simple"
import { ChartAreaInteractive } from "@/components/chart-area-interactive-shadcn"
import { TopCampaignsTable } from "@/components/top-campaigns-table"
import { DashboardDateFilter } from "@/components/dashboard-date-filter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { prisma } from "@/lib/prisma"
import { formatCurrency } from "@/lib/utils"

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
    const dateRange = getDateRange(params?.range || "30d")
    const { startDate, endDate } = dateRange
    
    // For comparison (previous period)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const comparisonStartDate = new Date(startDate)
    comparisonStartDate.setDate(comparisonStartDate.getDate() - daysDiff)
    const comparisonEndDate = new Date(startDate)

    // Get metrics - wrap each query in try-catch to handle database errors gracefully
    const [
      totalDonors,
      totalDonorsLastPeriod,
      activeAppeals,
      totalDonations,
      totalDonationsLastPeriod,
      activeFundraisers,
      totalIncome,
      totalIncomeLastPeriod,
    ] = await Promise.all([
      prisma.donor.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }).catch(() => 0),
      prisma.donor.count({
        where: {
          createdAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
        },
      }).catch(() => 0),
      prisma.appeal.count({
        where: { isActive: true },
      }).catch(() => 0),
      prisma.donation.count({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }).catch(() => 0),
      prisma.donation.count({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
        },
      }).catch(() => 0),
      prisma.fundraiser.count({
        where: { isActive: true },
      }).catch(() => 0),
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
    ])

    // Get payment method data (online, card, cash)
    const [onlineDonations, cardDonations, cashDonations] = await Promise.all([
      // Online = STRIPE donations
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          paymentMethod: "STRIPE",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Card = CARD donations (SumUp card readers)
      prisma.donation.aggregate({
        where: {
          status: "COMPLETED",
          paymentMethod: "CARD",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amountPence: true },
      }).catch(() => ({ _sum: { amountPence: 0 } })),
      // Cash = CASH from offline income
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
    ])

    // Get offline income and collections for the date range to calculate total "other" sources
    const [offlineIncomeTotal, collectionsTotal] = await Promise.all([
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
    ])
    
    // Calculate real distribution based on actual payment methods
    const onlineAmount = (onlineDonations._sum.amountPence || 0) / 100
    const cardAmount = (cardDonations._sum.amountPence || 0) / 100
    const cashAmount = (cashDonations._sum.amountPence || 0) / 100
    const totalOfflineAmount = (offlineIncomeTotal._sum.amountPence || 0) / 100
    const totalCollectionsAmount = (collectionsTotal._sum.amountPence || 0) / 100
    
    const paymentMethodData = [
      {
        name: "online",
        value: onlineDonations._sum.amountPence || 0,
        label: "Online",
      },
      {
        name: "card",
        value: cardDonations._sum.amountPence || 0,
        label: "Card",
      },
      {
        name: "cash",
        value: cashDonations._sum.amountPence || 0,
        label: "Cash",
      },
    ]
    
    // Update distribution data with real payment method data
    const distributionData = [
      {
        name: "online",
        value: onlineAmount,
        label: "Online (Stripe)",
      },
      {
        name: "card",
        value: cardAmount,
        label: "Card (SumUp)",
      },
      {
        name: "cash",
        value: cashAmount + totalOfflineAmount + totalCollectionsAmount,
        label: "Cash & Other",
      },
    ]

    // Ensure we're using the correct data sources strictly:
    // Online = STRIPE donations only
    // Card = CARD donations only  
    // Cash = CASH from offline income only
    
    // Server-side log to verify data
    console.log("[SERVER] Payment method data:", JSON.stringify({
      online: { pence: onlineDonations._sum.amountPence || 0, pounds: ((onlineDonations._sum.amountPence || 0) / 100).toFixed(2) },
      card: { pence: cardDonations._sum.amountPence || 0, pounds: ((cardDonations._sum.amountPence || 0) / 100).toFixed(2) },
      cash: { pence: cashDonations._sum.amountPence || 0, pounds: ((cashDonations._sum.amountPence || 0) / 100).toFixed(2) },
    }))


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
        // Online donations (STRIPE)
        prisma.donation.aggregate({
          where: {
            status: "COMPLETED",
            paymentMethod: "STRIPE",
            createdAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
          _sum: { amountPence: true },
        }).catch(() => ({ _sum: { amountPence: 0 } })),
        // Card donations (CARD - SumUp card readers)
        prisma.donation.aggregate({
          where: {
            status: "COMPLETED",
            paymentMethod: "CARD",
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

    // Get top performing projects (appeals)
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

    // Calculate total amount for each appeal
    const campaignsWithAmounts = appeals.map((appeal) => {
      const donationsTotal = appeal.donations.reduce((sum, d) => sum + d.amountPence, 0)
      const offlineTotal = appeal.offlineIncome.reduce((sum, d) => sum + d.amountPence, 0)
      const collectionsTotal = appeal.collections.reduce((sum, d) => sum + d.amountPence, 0)
      const totalAmount = donationsTotal + offlineTotal + collectionsTotal

      return {
        id: appeal.id,
        name: appeal.title,
        amountPence: totalAmount,
      }
    })

    // Sort by amount descending and take top 6
    const topProjects = campaignsWithAmounts
      .sort((a, b) => b.amountPence - a.amountPence)
      .slice(0, 6)

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

    // Calculate trends
    const donorsTrend = totalDonorsLastPeriod
      ? ((totalDonors - totalDonorsLastPeriod) / totalDonorsLastPeriod) * 100
      : 0
    const donationsTrend = totalDonationsLastPeriod
      ? ((totalDonations - totalDonationsLastPeriod) / totalDonationsLastPeriod) * 100
      : 0
    const incomeTrend = totalIncomeLastPeriod._sum.amountPence
      ? ((totalIncome._sum.amountPence || 0) - totalIncomeLastPeriod._sum.amountPence) /
        totalIncomeLastPeriod._sum.amountPence *
        100
      : 0

    // Format latest donations
    const latestTransactions = latestDonations.map((donation) => ({
      id: donation.id,
      paidBy: `${donation.donor.firstName} ${donation.donor.lastName}`,
      packageName: donation.appeal?.title || "General Donation",
      price: formatCurrency(donation.amountPence),
      status: donation.status === "COMPLETED" ? ("Active" as const) : ("Expired" as const),
      paidDate: new Date(donation.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    }))

    return (
      <>
        <AdminHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
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
                      <div className="text-2xl font-bold">{formatCurrency(totalIncome._sum.amountPence || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        vs previous period{" "}
                        <span className={incomeTrend >= 0 ? "text-green-600" : "text-red-600"}>
                          {incomeTrend >= 0 ? "↑" : "↓"} {Math.abs(incomeTrend).toFixed(2)}%
                        </span>
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Donations */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalDonations.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        vs previous period{" "}
                        <span className={donationsTrend >= 0 ? "text-green-600" : "text-red-600"}>
                          {donationsTrend >= 0 ? "↑" : "↓"} {Math.abs(donationsTrend).toFixed(2)}%
                        </span>
                      </p>
                    </CardContent>
                  </Card>

                  {/* Appeals */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Appeals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeAppeals}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Currently active appeals
                      </p>
                    </CardContent>
                  </Card>

                  {/* Active Fundraisers */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Fundraisers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeFundraisers}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active fundraising pages
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Second Row: Pie Chart and Top Performing Projects Table Side by Side */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-5">
                  <div className="md:col-span-2 flex w-full">
                    <div className="w-full">
                      <ChartPieSimple data={paymentMethodData} />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex w-full">
                    <Card className="flex flex-col w-full">
                      <CardHeader>
                        <CardTitle>Top Fundraising Appeals</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <TopCampaignsTable campaigns={topProjects} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Third Row: Donations Over Time Chart */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <ChartAreaInteractive data={lineChartData} />
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
        name: "online",
        value: 0,
        label: "Online",
      },
      {
        name: "card",
        value: 0,
        label: "Card",
      },
      {
        name: "cash",
        value: 0,
        label: "Cash",
      },
    ]

    const lineChartData: Array<{ date: string; desktop: number; mobile: number }> = []
    const topProjects: Array<{ id: string; name: string; amountPence: number }> = []
    const latestTransactions: Array<{ id: string; paidBy: string; packageName: string; price: string; status: "Active" | "Expired"; paidDate: string }> = []

    return (
      <>
        <AdminHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <DashboardDateFilter />
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
                        No data available
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Donations */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No data available
                      </p>
                    </CardContent>
                  </Card>

                  {/* Appeals */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Appeals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No data available
                      </p>
                    </CardContent>
                  </Card>

                  {/* Active Fundraisers */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Fundraisers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        No data available
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Second Row: Pie Chart and Top Performing Projects Table Side by Side */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-5">
                  <div className="md:col-span-2 flex w-full">
                    <div className="w-full">
                      <ChartPieSimple data={paymentMethodData} />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex w-full">
                    <Card className="flex flex-col w-full">
                      <CardHeader>
                        <CardTitle>Top Fundraising Appeals</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <TopCampaignsTable campaigns={topProjects} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Third Row: Donations Over Time Chart */}
              <div className="px-2 sm:px-2 sm:px-4 lg:px-6">
                <ChartAreaInteractive data={lineChartData} />
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
}
