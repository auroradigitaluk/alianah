import { prisma } from "../lib/prisma"

async function addFakeDonations() {
  try {
    // Find the Palestine Emergency Appeal fundraiser created by Saif
    const fundraiser = await prisma.fundraiser.findFirst({
      where: {
        title: {
          contains: "Palestine",
        },
        fundraiserName: "Saif",
      },
      include: {
        appeal: true,
      },
    })

    if (!fundraiser) {
      console.log("Fundraiser not found. Please create one first.")
      return
    }

    console.log(`Found fundraiser: ${fundraiser.title} (ID: ${fundraiser.id})`)

    // Create or get fake donors
    const fakeDonors = [
      {
        firstName: "Ahmed",
        lastName: "Hassan",
        email: "ahmed.hassan@example.com",
      },
      {
        firstName: "Fatima",
        lastName: "Ali",
        email: "fatima.ali@example.com",
      },
      {
        firstName: "Mohammed",
        lastName: "Ibrahim",
        email: "mohammed.ibrahim@example.com",
      },
      {
        firstName: "Aisha",
        lastName: "Khan",
        email: "aisha.khan@example.com",
      },
      {
        firstName: "Omar",
        lastName: "Malik",
        email: "omar.malik@example.com",
      },
    ]

    const donors = await Promise.all(
      fakeDonors.map(async (donorData) => {
        return await prisma.donor.upsert({
          where: { email: donorData.email },
          update: {},
          create: donorData,
        })
      })
    )

    console.log(`Created/found ${donors.length} donors`)

    // Create fake donations with varying amounts and dates
    const fakeDonations = [
      {
        donor: donors[0],
        amountPence: 5000, // £50.00
        donationType: "SADAQAH",
        frequency: "ONE_OFF",
        paymentMethod: "STRIPE",
        giftAid: true,
        daysAgo: 2,
      },
      {
        donor: donors[1],
        amountPence: 10000, // £100.00
        donationType: "ZAKAT",
        frequency: "ONE_OFF",
        paymentMethod: "STRIPE",
        giftAid: false,
        daysAgo: 5,
      },
      {
        donor: donors[2],
        amountPence: 2500, // £25.00
        donationType: "GENERAL",
        frequency: "MONTHLY",
        paymentMethod: "CARD",
        giftAid: true,
        daysAgo: 1,
      },
      {
        donor: donors[3],
        amountPence: 20000, // £200.00
        donationType: "LILLAH",
        frequency: "ONE_OFF",
        paymentMethod: "STRIPE",
        giftAid: true,
        daysAgo: 7,
      },
      {
        donor: donors[4],
        amountPence: 1500, // £15.00
        donationType: "GENERAL",
        frequency: "ONE_OFF",
        paymentMethod: "PAYPAL",
        giftAid: false,
        daysAgo: 0,
      },
      {
        donor: donors[0],
        amountPence: 7500, // £75.00
        donationType: "SADAQAH",
        frequency: "ONE_OFF",
        paymentMethod: "STRIPE",
        giftAid: true,
        daysAgo: 10,
      },
      {
        donor: donors[2],
        amountPence: 30000, // £300.00
        donationType: "ZAKAT",
        frequency: "YEARLY",
        paymentMethod: "CARD",
        giftAid: true,
        daysAgo: 3,
      },
    ]

    const donations = await Promise.all(
      fakeDonations.map(async (donationData) => {
        const createdAt = new Date()
        createdAt.setDate(createdAt.getDate() - donationData.daysAgo)
        const completedAt = new Date(createdAt)
        completedAt.setHours(completedAt.getHours() + 1) // Completed 1 hour after creation

        return await prisma.donation.create({
          data: {
            donorId: donationData.donor.id,
            appealId: fundraiser.appealId,
            fundraiserId: fundraiser.id,
            amountPence: donationData.amountPence,
            donationType: donationData.donationType,
            frequency: donationData.frequency,
            status: "COMPLETED",
            paymentMethod: donationData.paymentMethod,
            transactionId: `txn_${Math.random().toString(36).substring(2, 15)}`,
            giftAid: donationData.giftAid,
            createdAt,
            completedAt,
          },
        })
      })
    )

    const totalRaised = donations.reduce((sum, d) => sum + d.amountPence, 0)

    console.log(`\n✅ Created ${donations.length} fake donations`)
    console.log(`💰 Total raised: £${(totalRaised / 100).toFixed(2)}`)
    console.log(`\nDonations:`)
    donations.forEach((donation) => {
      const donor = donors.find((d) => d.id === donation.donorId)
      const donorData = fakeDonors.find((d) => d.email === donor?.email)
      console.log(
        `  - ${donorData?.firstName} ${donorData?.lastName}: £${(donation.amountPence / 100).toFixed(2)} (${donation.donationType})`
      )
    })
  } catch (error) {
    console.error("Error adding fake donations:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addFakeDonations()
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Failed:", error)
    process.exit(1)
  })
