import { prisma } from "../lib/prisma"

type DemoDonor = {
  title?: string | null
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  country?: string | null
}

type DemoMasjid = {
  name: string
  city: string
  address: string
  contactName?: string | null
  phone?: string | null
  email?: string | null
}

async function ensureDonors() {
  const demoDonors: DemoDonor[] = [
    {
      title: "Mr",
      firstName: "Hamza",
      lastName: "Farooq",
      email: "hamza.demo@example.com",
      phone: "07111 111111",
      address: "1 Demo Lane",
      city: "Leeds",
      postcode: "LS1 1AA",
      country: "UK",
    },
    {
      title: "Mrs",
      firstName: "Noor",
      lastName: "Begum",
      email: "noor.demo@example.com",
      phone: null,
      address: "22 Sample Road",
      city: "Birmingham",
      postcode: "B1 1AA",
      country: "UK",
    },
    {
      title: "Ms",
      firstName: "Amina",
      lastName: "Zahid",
      email: "amina.demo@example.com",
      phone: "07999 999999",
      address: null,
      city: "Manchester",
      postcode: "M2 2BB",
      country: "UK",
    },
  ]

  const donors = []
  for (const donor of demoDonors) {
    const record = await prisma.donor.upsert({
      where: { email: donor.email },
      update: {},
      create: donor,
    })
    donors.push(record)
  }
  return donors
}

async function ensureMasjids() {
  const demoMasjids: DemoMasjid[] = [
    {
      name: "Masjid Al Noor",
      city: "London",
      address: "10 Demo Street",
      contactName: "Yasir Khan",
      phone: "0207 000 0001",
      email: "masjid.noor@example.com",
    },
    {
      name: "Masjid Al Rahma",
      city: "Leicester",
      address: "25 Sample Road",
      contactName: "Aisha Malik",
      phone: "0116 000 0002",
      email: "masjid.rahma@example.com",
    },
    {
      name: "Masjid Al Salam",
      city: "Bradford",
      address: "7 Example Lane",
      contactName: "Bilal Ahmed",
      phone: "01274 000 0003",
      email: "masjid.salam@example.com",
    },
  ]

  const masjids = []
  for (const masjid of demoMasjids) {
    const existing = await prisma.masjid.findFirst({
      where: { name: masjid.name },
    })
    if (existing) {
      masjids.push(existing)
      continue
    }
    const record = await prisma.masjid.create({ data: masjid })
    masjids.push(record)
  }
  return masjids
}

async function ensureFundraisers(appealId: string | null) {
  if (!appealId) {
    console.log("No appeal found. Skipping demo fundraisers.")
    return []
  }

  const demoFundraisers = [
    {
      title: "Build a Water Well",
      slug: "demo-water-well",
      fundraiserName: "Yusuf Karim",
      email: "yusuf.demo@example.com",
      isActive: true,
    },
    {
      title: "Support Gaza Relief",
      slug: "demo-gaza-relief",
      fundraiserName: "Layla Ahmed",
      email: "layla.demo@example.com",
      isActive: false,
    },
    {
      title: "Community Aid Drive",
      slug: "demo-community-aid",
      fundraiserName: "Imran Qureshi",
      email: "imran.demo@example.com",
      isActive: true,
    },
  ]

  const fundraisers = []
  for (const fundraiser of demoFundraisers) {
    const record = await prisma.fundraiser.upsert({
      where: { slug: fundraiser.slug },
      update: {
        title: fundraiser.title,
        fundraiserName: fundraiser.fundraiserName,
        email: fundraiser.email,
        isActive: fundraiser.isActive,
        appealId,
      },
      create: {
        ...fundraiser,
        appealId,
      },
    })
    fundraisers.push(record)
  }
  return fundraisers
}

async function ensureDonations(donors: { id: string }[], appealId: string | null) {
  const demoDonations = [
    {
      donorIndex: 0,
      amountPence: 2500,
      donationType: "SADAQAH",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "WEBSITE_STRIPE",
      collectedVia: "website",
      transactionId: "demo_txn_1",
      orderNumber: "DEMO-1001",
      giftAid: true,
      billingAddress: "12 Demo Street",
      billingCity: "London",
      billingPostcode: "SW1A 1AA",
      billingCountry: "UK",
    },
    {
      donorIndex: 1,
      amountPence: 5000,
      donationType: "ZAKAT",
      frequency: "ONE_OFF",
      status: "FAILED",
      paymentMethod: "WEBSITE_STRIPE",
      collectedVia: "website",
      transactionId: "demo_txn_2",
      orderNumber: "DEMO-1002",
      giftAid: false,
      billingAddress: "88 Sample Road",
      billingCity: "Manchester",
      billingPostcode: "M1 1AA",
      billingCountry: "UK",
    },
    {
      donorIndex: 2,
      amountPence: 1200,
      donationType: "GENERAL",
      frequency: "ONE_OFF",
      status: "REFUNDED",
      paymentMethod: "CARD_SUMUP",
      collectedVia: "office",
      transactionId: "demo_txn_3",
      orderNumber: "DEMO-1003",
      giftAid: false,
      billingAddress: null,
      billingCity: null,
      billingPostcode: null,
      billingCountry: null,
    },
  ]

  for (const donation of demoDonations) {
    const existing = await prisma.donation.findFirst({
      where: { orderNumber: donation.orderNumber },
    })
    if (existing) continue
    const now = new Date()
    const completedAt = donation.status === "FAILED" ? null : now
    await prisma.donation.create({
      data: {
        donorId: donors[donation.donorIndex].id,
        appealId,
        amountPence: donation.amountPence,
        donationType: donation.donationType,
        frequency: donation.frequency,
        status: donation.status,
        paymentMethod: donation.paymentMethod,
        collectedVia: donation.collectedVia,
        transactionId: donation.transactionId,
        orderNumber: donation.orderNumber,
        giftAid: donation.giftAid,
        billingAddress: donation.billingAddress,
        billingCity: donation.billingCity,
        billingPostcode: donation.billingPostcode,
        billingCountry: donation.billingCountry,
        createdAt: now,
        completedAt,
      },
    })
  }
}

async function ensureRecurring(donors: { id: string }[], appealId: string | null) {
  const demoRecurring = [
    {
      donorIndex: 0,
      amountPence: 1500,
      donationType: "GENERAL",
      frequency: "MONTHLY",
      status: "ACTIVE",
      subscriptionId: "sub_demo_1",
      nextPaymentDate: new Date(),
      lastPaymentDate: new Date(),
    },
    {
      donorIndex: 1,
      amountPence: 2500,
      donationType: "SADAQAH",
      frequency: "MONTHLY",
      status: "PAUSED",
      subscriptionId: "sub_demo_2",
      nextPaymentDate: new Date(),
      lastPaymentDate: new Date(),
    },
    {
      donorIndex: 2,
      amountPence: 4000,
      donationType: "ZAKAT",
      frequency: "YEARLY",
      status: "FAILED",
      subscriptionId: "sub_demo_3",
      nextPaymentDate: new Date(),
      lastPaymentDate: null,
    },
  ]

  for (const recurring of demoRecurring) {
    const existing = await prisma.recurringDonation.findFirst({
      where: { subscriptionId: recurring.subscriptionId },
    })
    if (existing) continue
    await prisma.recurringDonation.create({
      data: {
        donorId: donors[recurring.donorIndex].id,
        appealId,
        amountPence: recurring.amountPence,
        donationType: recurring.donationType,
        frequency: recurring.frequency,
        status: recurring.status,
        paymentMethod: "STRIPE",
        subscriptionId: recurring.subscriptionId,
        nextPaymentDate: recurring.nextPaymentDate,
        lastPaymentDate: recurring.lastPaymentDate,
      },
    })
  }
}

async function ensureOfflineIncome(appealId: string | null) {
  const demoIncome = [
    {
      amountPence: 8000,
      donationType: "GENERAL",
      source: "CASH",
      receivedAt: new Date(),
      notes: "Demo seed: Friday collection",
    },
    {
      amountPence: 12000,
      donationType: "ZAKAT",
      source: "BANK_TRANSFER",
      receivedAt: new Date(),
      notes: "Demo seed: Local business transfer",
    },
    {
      amountPence: 5000,
      donationType: "SADAQAH",
      source: "CASH",
      receivedAt: new Date(),
      notes: "Demo seed",
    },
  ]

  for (const income of demoIncome) {
    const existing = await prisma.offlineIncome.findFirst({
      where: { notes: income.notes },
    })
    if (existing) continue
    await prisma.offlineIncome.create({
      data: {
        appealId,
        amountPence: income.amountPence,
        donationType: income.donationType,
        source: income.source,
        receivedAt: income.receivedAt,
        notes: income.notes,
      },
    })
  }
}

async function ensureCollections(masjids: { id: string }[], appealId: string | null) {
  const demoCollections = [
    {
      masjidIndex: 0,
      amountPence: 14000,
      donationType: "GENERAL",
      type: "JUMMAH",
      collectedAt: new Date(),
      notes: "Demo seed: Weekly collection",
    },
    {
      masjidIndex: 1,
      amountPence: 22000,
      donationType: "SADAQAH",
      type: "RAMADAN",
      collectedAt: new Date(),
      notes: "Demo seed",
    },
    {
      masjidIndex: 2,
      amountPence: 9000,
      donationType: "ZAKAT",
      type: "EID",
      collectedAt: new Date(),
      notes: "Demo seed: Eid fundraiser",
    },
  ]

  for (const collection of demoCollections) {
    const existing = await prisma.collection.findFirst({
      where: { notes: collection.notes },
    })
    if (existing) continue
    await prisma.collection.create({
      data: {
        masjidId: masjids[collection.masjidIndex].id,
        appealId,
        amountPence: collection.amountPence,
        donationType: collection.donationType,
        type: collection.type,
        collectedAt: collection.collectedAt,
        notes: collection.notes,
      },
    })
  }
}

async function main() {
  const appeal = await prisma.appeal.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  const appealId = appeal?.id || null

  const donors = await ensureDonors()
  const masjids = await ensureMasjids()

  await ensureFundraisers(appealId)
  await ensureDonations(donors, appealId)
  await ensureRecurring(donors, appealId)
  await ensureOfflineIncome(appealId)
  await ensureCollections(masjids, appealId)

  console.log("Demo data seeded.")
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error("Failed to seed demo data:", error)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
