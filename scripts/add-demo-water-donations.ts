import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./prisma/dev.db",
    },
  },
})

async function main() {
  console.log("Adding demo water project donations...")

  // Get all water projects
  const projects = await prisma.waterProject.findMany()
  console.log(`Found ${projects.length} water projects`)

  // Get all countries
  const countries = await prisma.waterProjectCountry.findMany({
    where: { isActive: true },
  })
  console.log(`Found ${countries.length} active countries`)

  // Get or create some demo donors
  const demoDonors = [
    {
      firstName: "Ahmed",
      lastName: "Hassan",
      email: "ahmed.hassan@example.com",
      phone: "+44 20 7123 4567",
    },
    {
      firstName: "Fatima",
      lastName: "Ali",
      email: "fatima.ali@example.com",
      phone: "+44 121 987 6543",
    },
    {
      firstName: "Mohammed",
      lastName: "Khan",
      email: "mohammed.khan@example.com",
      phone: "+44 161 234 5678",
    },
    {
      firstName: "Aisha",
      lastName: "Rahman",
      email: "aisha.rahman@example.com",
      phone: "+44 113 456 7890",
    },
    {
      firstName: "Yusuf",
      lastName: "Ahmed",
      email: "yusuf.ahmed@example.com",
      phone: "+44 20 7654 3210",
    },
    {
      firstName: "Sarah",
      lastName: "Ibrahim",
      email: "sarah.ibrahim@example.com",
      phone: "+44 20 1234 5678",
    },
    {
      firstName: "Omar",
      lastName: "Malik",
      email: "omar.malik@example.com",
      phone: "+44 121 234 5678",
    },
    {
      firstName: "Zainab",
      lastName: "Hussain",
      email: "zainab.hussain@example.com",
      phone: "+44 161 345 6789",
    },
  ]

  const donors = []
  for (const donorData of demoDonors) {
    const donor = await prisma.donor.upsert({
      where: { email: donorData.email },
      update: {},
      create: donorData,
    })
    donors.push(donor)
  }

  console.log(`Created/updated ${donors.length} demo donors`)

  // Status options
  const statuses = ["WAITING_TO_REVIEW", "ORDERED", "PENDING", "COMPLETE", null]
  const donationTypes = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]

  // Create donations for each project
  let donationCount = 0

  for (const project of projects) {
    // Get countries for this project type
    const projectCountries = countries.filter((c) => c.projectType === project.projectType)

    if (projectCountries.length === 0) {
      console.log(`No countries found for ${project.projectType}, skipping...`)
      continue
    }

    // Create 3-8 donations per project
    const numDonations = Math.floor(Math.random() * 6) + 3

    for (let i = 0; i < numDonations; i++) {
      // Pick a random country for this project type
      const country = projectCountries[Math.floor(Math.random() * projectCountries.length)]

      // Pick a random donor
      const donor = donors[Math.floor(Math.random() * donors.length)]

      // Pick a random status
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      // Pick a random donation type
      const donationType = donationTypes[Math.floor(Math.random() * donationTypes.length)]

      // Use the country's price (or slightly vary it)
      const baseAmount = country.pricePence
      const amountVariation = Math.floor(Math.random() * (baseAmount * 0.2)) // ±20% variation
      const amountPence = baseAmount + (Math.random() > 0.5 ? amountVariation : -amountVariation)

      // Create donation date (random date in last 60 days)
      const daysAgo = Math.floor(Math.random() * 60)
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - daysAgo)
      createdAt.setHours(Math.floor(Math.random() * 24))
      createdAt.setMinutes(Math.floor(Math.random() * 60))

      const completedAt =
        status === "COMPLETE" ? new Date(createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null

      try {
        await prisma.waterProjectDonation.create({
          data: {
            waterProjectId: project.id,
            countryId: country.id,
            donorId: donor.id,
            amountPence: Math.max(1000, amountPence), // Minimum £10
            donationType,
            paymentMethod: "STRIPE",
            transactionId: `ch_water_${Date.now()}_${i}`,
            giftAid: Math.random() > 0.5,
            emailSent: true,
            reportSent: status === "COMPLETE",
            status,
            createdAt,
            completedAt,
            notes:
              status === "COMPLETE"
                ? `Project completed successfully in ${country.country}. All images and reports sent to donor.`
                : status === "PENDING"
                  ? `Project in progress. Currently being implemented in ${country.country}.`
                  : status === "ORDERED"
                    ? `Materials ordered and team dispatched to ${country.country}.`
                    : status === "WAITING_TO_REVIEW"
                      ? `Donation received. Awaiting review and commissioning for ${country.country}.`
                      : null,
          },
        })
        donationCount++
      } catch (error) {
        console.error(`Error creating donation for ${project.projectType}:`, error)
      }
    }
  }

  // Update project statuses based on donations
  for (const project of projects) {
    const projectDonations = await prisma.waterProjectDonation.findMany({
      where: { waterProjectId: project.id },
    })

    if (projectDonations.length > 0 && !project.status) {
      // Set project status to WAITING_TO_REVIEW if it has donations
      await prisma.waterProject.update({
        where: { id: project.id },
        data: { status: "WAITING_TO_REVIEW" },
      })
    }
  }

  console.log(`\n✅ Created ${donationCount} demo water project donations!`)
  console.log("\n📊 Summary:")
  for (const project of projects) {
    const projectDonations = await prisma.waterProjectDonation.findMany({
      where: { waterProjectId: project.id },
      include: { country: true },
    })
    const byStatus = projectDonations.reduce(
      (acc, d) => {
        const status = d.status || "No Status"
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    console.log(`   ${project.projectType}: ${projectDonations.length} donations`)
    console.log(`     Statuses: ${JSON.stringify(byStatus)}`)
  }
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
