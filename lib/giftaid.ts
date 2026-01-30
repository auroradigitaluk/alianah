export type GiftAidScheduleRow = {
  id: string
  donorId: string
  title: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  giftAidClaimed: boolean
  houseNumber: string | null
  postcode: string | null
  aggregated: string | null
  sponsored: string | null
  donationDate: string
  amountPence: number
}

export type GiftAidScheduleSummary = {
  totalAmountPence: number
  totalCount: number
}

export type GiftAidScheduleResponse = {
  range: { start: string; end: string }
  eligible: {
    rows: GiftAidScheduleRow[]
    summary: GiftAidScheduleSummary
  }
  ineligible: {
    rows: GiftAidScheduleRow[]
    summary: GiftAidScheduleSummary
  }
}
