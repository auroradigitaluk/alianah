export type ReportDateRange = {
  start: string
  end: string
}

export type ReportRow = {
  label: string
  count?: number
  amountPence?: number
  extra?: string | null
}

export type FinancialReport = {
  totalIncomePence: number
  totalCount: number
  giftAidPence: number
  sources: ReportRow[]
}

export type DonationsReport = {
  byType: ReportRow[]
  byPaymentMethod: ReportRow[]
  byAppeal: ReportRow[]
  byFundraiser: ReportRow[]
  byStatus: ReportRow[]
  byChannel: ReportRow[]
  byCountry: ReportRow[]
  byCity: ReportRow[]
  giftAid: ReportRow[]
}

export type DonorSummary = {
  totalDonors: number
  newDonors: number
  returningDonors: number
  giftAidRate: number
  totalDonations: number
}

export type DonorsReport = {
  summary: DonorSummary
  topDonors: Array<{
    donorId: string
    name: string
    email: string
    amountPence: number
    donationCount: number
  }>
  byCountry: ReportRow[]
  byCity: ReportRow[]
}

export type CollectionsReport = {
  totalCollectedPence: number
  collectionCount: number
  byType: ReportRow[]
  byMasjid: ReportRow[]
  byAppeal: ReportRow[]
}

export type FundraisingReport = {
  totalRaisedPence: number
  activeFundraisers: number
  fundraiserCount: number
  byFundraiser: ReportRow[]
  byFundraiserTarget: Array<{
    fundraiserId: string
    label: string
    amountPence: number
    targetPence: number | null
    percent: number | null
  }>
}

export type ProjectsReport = {
  water: {
    totalPence: number
    donationCount: number
    completedReports: number
    byProjectType: ReportRow[]
    byStatus: ReportRow[]
  }
  sponsorship: {
    totalPence: number
    donationCount: number
    completedReports: number
    byProjectType: ReportRow[]
    byStatus: ReportRow[]
  }
}

export type RecurringReport = {
  activeTotalPence: number
  activeCount: number
  byStatus: ReportRow[]
  byFrequency: ReportRow[]
  nextPaymentMonth: ReportRow[]
}

export type AppealsReport = {
  byAppeal: Array<{
    appealId: string | null
    label: string
    donationAmountPence: number
    donationCount: number
    offlineAmountPence: number
    collectionAmountPence: number
    totalPence: number
  }>
}

export type OperationsReport = {
  refunds: ReportRow[]
  failed: ReportRow[]
}

export type StaffReportRow = {
  staffId: string
  label: string
  offlineIncomePence: number
  offlineIncomeCount: number
  collectionsPence: number
  collectionsCount: number
  waterDonationsPence: number
  waterDonationsCount: number
  sponsorshipDonationsPence: number
  sponsorshipDonationsCount: number
  totalPence: number
  totalCount: number
}

export type StaffReport = {
  byStaff: StaffReportRow[]
}

export type ReportsResponse = {
  range: ReportDateRange
  financial: FinancialReport
  donations: DonationsReport
  donors: DonorsReport
  collections: CollectionsReport
  fundraising: FundraisingReport
  projects: ProjectsReport
  recurring: RecurringReport
  appeals: AppealsReport
  operations: OperationsReport
  staff: StaffReport
}
