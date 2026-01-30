import { prisma } from "../lib/prisma"

const donors = [
  {
    firstName: "Zara",
    lastName: "Khan",
    email: "zara.khan+demo@example.com",
    phone: "07111 111111",
    address: "12 Demo Street",
    city: "London",
    postcode: "SW1A 1AA",
    country: "United Kingdom",
  },
  {
    firstName: "Omar",
    lastName: "Ali",
    email: "omar.ali+demo@example.com",
    phone: "07222 222222",
    address: "34 Sample Road",
    city: "Birmingham",
    postcode: "B1 1AA",
    country: "United Kingdom",
  },
  {
    firstName: "Layla",
    lastName: "Hassan",
    email: "layla.hassan+demo@example.com",
    phone: "07333 333333",
    address: "56 Charity Lane",
    city: "Manchester",
    postcode: "M1 1AE",
    country: "United Kingdom",
  },
  {
    firstName: "Yusuf",
    lastName: "Ibrahim",
    email: "yusuf.ibrahim+demo@example.com",
    phone: "07444 444444",
    address: "78 Giving Avenue",
    city: "Leeds",
    postcode: "LS1 1UR",
    country: "United Kingdom",
  },
  {
    firstName: "Amina",
    lastName: "Farooq",
    email: "amina.farooq+demo@example.com",
    phone: "07555 555555",
    address: "90 Hope Street",
    city: "Glasgow",
    postcode: "G1 1AA",
    country: "United Kingdom",
  },
]

const donationTemplate = [
  { amountPence: 2500, donationType: "GENERAL", frequency: "ONE_OFF", paymentMethod: "WEBSITE_STRIPE", giftAid: true },
  { amountPence: 5000, donationType: "SADAQAH", frequency: "ONE_OFF", paymentMethod: "CARD_SUMUP", giftAid: false },
  { amountPence: 1500, donationType: "LILLAH", frequency: "ONE_OFF", paymentMethod: "CASH", giftAid: true },
  { amountPence: 10000, donationType: "ZAKAT", frequency: "ONE_OFF", paymentMethod: "BANK_TRANSFER", giftAid: false },
  { amountPence: 3500, donationType: "GENERAL", frequency: "MONTHLY", paymentMethod: "WEBSITE_STRIPE", giftAid: true },
  { amountPence: 4200, donationType: "SADAQAH", frequency: "ONE_OFF", paymentMethod: "CARD_SUMUP", giftAid: false },
  { amountPence: 8000, donationType: "ZAKAT", frequency: "YEARLY", paymentMethod: "BANK_TRANSFER", giftAid: true },
  { amountPence: 6000, donationType: "LILLAH", frequency: "ONE_OFF", paymentMethod: "CASH", giftAid: false },
  { amountPence: 2750, donationType: "GENERAL", frequency: "ONE_OFF", paymentMethod: "WEBSITE_STRIPE", giftAid: true },
  { amountPence: 1250, donationType: "SADAQAH", frequency: "ONE_OFF", paymentMethod: "CARD_SUMUP", giftAid: false },
]

async function run() {
  try {
    const createdDonors = await Promise.all(
      donors.map((donor) =>
        prisma.donor.upsert({
          where: { email: donor.email },
          update: {},
          create: donor,
        })
      )
    )

    const now = new Date()
    const donations = await Promise.all(
      donationTemplate.map((template, index) => {
        const donor = createdDonors[index % createdDonors.length]
        const createdAt = new Date(now)
        createdAt.setDate(createdAt.getDate() - (index + 1))
        const completedAt = new Date(createdAt)
        completedAt.setMinutes(completedAt.getMinutes() + 10)

        return prisma.donation.create({
          data: {
            donorId: donor.id,
            amountPence: template.amountPence,
            donationType: template.donationType,
            frequency: template.frequency,
            status: "COMPLETED",
            paymentMethod: template.paymentMethod,
            collectedVia: "website",
            transactionId: `demo_${Math.random().toString(36).slice(2, 10)}`,
            giftAid: template.giftAid,
            giftAidClaimed: false,
            billingAddress: donor.address,
            billingCity: donor.city,
            billingPostcode: donor.postcode,
            billingCountry: donor.country,
            createdAt,
            completedAt,
          },
        })
      })
    )

    const total = donations.reduce((sum, donation) => sum + donation.amountPence, 0)
    console.log(`Created ${donations.length} fake donations`)
    console.log(`Total: £${(total / 100).toFixed(2)}`)
  } catch (error) {
    console.error("Failed to add fake donations:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
