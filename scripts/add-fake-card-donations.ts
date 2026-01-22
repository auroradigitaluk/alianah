import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./prisma/dev.db",
    },
  },
})

async function main() {
  console.log("Adding fake card donations (SumUp card readers) to the app...")

  // Get all active appeals (or all appeals if none are active)
  let appeals = await prisma.appeal.findMany({
    where: { isActive: true },
    take: 10, // Limit to 10 appeals
  })

  // If no active appeals, get any appeals
  if (appeals.length === 0) {
    appeals = await prisma.appeal.findMany({
      take: 10,
    })
  }

  if (appeals.length === 0) {
    console.log("No appeals found. Please run seed first.")
    return
  }

  console.log(`Found ${appeals.length} appeal(s) to use`)

  // Get or create some donors for card donations
  const donorEmails = [
    "card.donor1@example.com",
    "card.donor2@example.com",
    "card.donor3@example.com",
    "card.donor4@example.com",
    "card.donor5@example.com",
    "card.donor6@example.com",
    "card.donor7@example.com",
    "card.donor8@example.com",
  ]

  const donors = []
  for (const email of donorEmails) {
    const donor = await prisma.donor.upsert({
      where: { email },
      update: {},
      create: {
        firstName: email.split("@")[0].split(".")[1] || "Card",
        lastName: "Donor",
        email,
        phone: `+44${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        city: "London",
        country: "UK",
      },
    })
    donors.push(donor)
  }

  // Generate fake card donations spread across the last 90 days
  const now = new Date()
  const fakeCardDonations = []
  const maxAmountPence = 1000000 // £10,000 maximum

  // Generate donations for the last 90 days
  for (let i = 0; i < 90; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Vary the number of card donations per day (0-3 donations per day)
    const donationsPerDay = Math.floor(Math.random() * 4)

    for (let j = 0; j < donationsPerDay; j++) {
      const donorIndex = Math.floor(Math.random() * donors.length)
      const appealIndex = Math.floor(Math.random() * appeals.length)
      const selectedAppeal = appeals[appealIndex]
      const selectedDonor = donors[donorIndex]

      // Random amount between £10 and £10,000 (no more than £10,000)
      const amountPence = Math.floor(Math.random() * (maxAmountPence - 1000)) + 1000

      // Random donation type
      const donationTypes = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]
      const donationType = donationTypes[Math.floor(Math.random() * donationTypes.length)]

      // Mostly completed, some pending
      const status = Math.random() > 0.15 ? "COMPLETED" : "PENDING"

      const donationDate = new Date(date)
      donationDate.setHours(Math.floor(Math.random() * 24))
      donationDate.setMinutes(Math.floor(Math.random() * 60))

      fakeCardDonations.push({
        donorId: selectedDonor.id,
        appealId: selectedAppeal.id,
        amountPence,
        donationType,
        frequency: "ONE_OFF",
        status,
        paymentMethod: "CARD", // Card payments via SumUp card readers
        transactionId: `sumup_${i}_${j}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        giftAid: Math.random() > 0.4, // 60% claim gift aid
        createdAt: donationDate,
        completedAt: status === "COMPLETED" ? donationDate : null,
      })
    }
  }

  // Add some larger card donations (between £1,000 and £10,000)
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)

    const donorIndex = Math.floor(Math.random() * donors.length)
    const appealIndex = Math.floor(Math.random() * appeals.length)
    const selectedAppeal = appeals[appealIndex]
    const selectedDonor = donors[donorIndex]

    // Amount between £1,000 and £10,000
    const amountPence = Math.floor(Math.random() * (maxAmountPence - 100000)) + 100000

    const donationTypes = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]
    const donationType = donationTypes[Math.floor(Math.random() * donationTypes.length)]

    const donationDate = new Date(date)
    donationDate.setHours(Math.floor(Math.random() * 24))
    donationDate.setMinutes(Math.floor(Math.random() * 60))

    fakeCardDonations.push({
      donorId: selectedDonor.id,
      appealId: selectedAppeal.id,
      amountPence,
      donationType,
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "CARD", // Card payments via SumUp card readers
      transactionId: `sumup_large_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      giftAid: Math.random() > 0.3, // 70% claim gift aid for larger donations
      createdAt: donationDate,
      completedAt: donationDate,
    })
  }

  // Insert all card donations in batches
  if (fakeCardDonations.length > 0) {
    const batchSize = 100
    let created = 0
    
    for (let i = 0; i < fakeCardDonations.length; i += batchSize) {
      const batch = fakeCardDonations.slice(i, i + batchSize)
      try {
        const result = await prisma.donation.createMany({
          data: batch,
        })
        created += result.count
      } catch (error: any) {
        // If duplicates exist, try inserting individually
        if (error.code === 'P2002') {
          for (const donation of batch) {
            try {
              await prisma.donation.create({ data: donation })
              created++
            } catch {
              // Skip duplicates
            }
          }
        } else {
          throw error
        }
      }
    }
    
    console.log(`✅ Created ${created} fake card donations (SumUp card readers)`)
    
    // Calculate total
    const totalPence = fakeCardDonations.reduce((sum, d) => sum + d.amountPence, 0)
    const totalPounds = (totalPence / 100).toLocaleString("en-GB", {
      style: "currency",
      currency: "GBP",
    })
    console.log(`💰 Total card donations: ${totalPounds}`)
    
    // Show breakdown
    const completed = fakeCardDonations.filter(d => d.status === "COMPLETED")
    const completedTotal = completed.reduce((sum, d) => sum + d.amountPence, 0)
    const completedPounds = (completedTotal / 100).toLocaleString("en-GB", {
      style: "currency",
      currency: "GBP",
    })
    console.log(`   Completed: ${completed.length} donations, ${completedPounds}`)
    console.log(`   Pending: ${fakeCardDonations.length - completed.length} donations`)
  } else {
    console.log("No card donations to create")
  }

  console.log("\n✅ Fake card donations (SumUp) added successfully!")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
