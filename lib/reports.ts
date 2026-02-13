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
  qurbani: {
    totalPence: number
    donationCount: number
    byCountry: ReportRow[]
    bySize: ReportRow[]
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

/** Full row-level detail for CSV export - all info, no limits (online donations) */
export type DonationDetailRow = {
  id: string
  createdAt: string
  completedAt: string | null
  amountPence: number
  donationType: string
  paymentMethod: string
  status: string
  frequency: string
  giftAid: boolean
  giftAidClaimed: boolean
  giftAidClaimedAt: string | null
  isAnonymous: boolean
  orderNumber: string | null
  transactionId: string | null
  collectedVia: string | null
  donorName: string
  donorEmail: string
  donorTitle: string | null
  donorFirstName: string
  donorLastName: string
  donorPhone: string | null
  donorAddress: string | null
  donorCity: string | null
  donorPostcode: string | null
  donorCountry: string | null
  billingAddress: string | null
  billingCity: string | null
  billingPostcode: string | null
  billingCountry: string | null
  appealTitle: string | null
  fundraiserName: string | null
  productName: string | null
}
export type CollectionDetailRow = {
  id: string
  collectedAt: string
  amountPence: number
  type: string
  donationType: string
  sadaqahPence: number
  zakatPence: number
  lillahPence: number
  cardPence: number
  masjidName: string | null
  otherLocationName: string | null
  appealTitle: string | null
  notes: string | null
  addedByName: string | null
}
export type OfflineIncomeDetailRow = {
  id: string
  receivedAt: string
  amountPence: number
  donationType: string
  source: string
  collectedVia: string | null
  giftAid: boolean
  notes: string | null
  appealTitle: string | null
  donorName: string | null
  donorEmail: string | null
  addedByName: string | null
}
export type WaterDonationDetailRow = {
  id: string
  createdAt: string
  amountPence: number
  donationType: string
  paymentMethod: string
  status: string | null
  giftAid: boolean
  projectType: string
  country: string
  donorName: string
  donorEmail: string
  addedByName: string | null
}
export type SponsorshipDonationDetailRow = {
  id: string
  createdAt: string
  amountPence: number
  donationType: string
  paymentMethod: string
  status: string | null
  giftAid: boolean
  projectType: string
  country: string
  donorName: string
  donorEmail: string
  addedByName: string | null
}

export type QurbaniDonationDetailRow = {
  id: string
  createdAt: string
  amountPence: number
  donationType: string
  paymentMethod: string
  giftAid: boolean
  country: string
  size: string
  qurbaniNames: string | null
  donorName: string
  donorEmail: string
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
  /** Full row-level detail for export - all records in range, no limits */
  donationsDetail: DonationDetailRow[]
  collectionsDetail: CollectionDetailRow[]
  offlineIncomeDetail: OfflineIncomeDetailRow[]
  waterDonationsDetail: WaterDonationDetailRow[]
  sponsorshipDonationsDetail: SponsorshipDonationDetailRow[]
  qurbaniDonationsDetail: QurbaniDonationDetailRow[]
}
