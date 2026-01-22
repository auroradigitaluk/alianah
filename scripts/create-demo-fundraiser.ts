import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Creating demo fundraiser for Egypt to Gaza appeal...")

  // Find or create the Egypt to Gaza appeal
  let egyptGazaAppeal = await prisma.appeal.findUnique({
    where: { slug: "egypt-gaza-humanitarian-convoy" },
  })

  if (!egyptGazaAppeal) {

    // Create the appeal
    egyptGazaAppeal = await prisma.appeal.create({
      data: {
        title: "Egypt to Gaza Humanitarian Convoy",
        slug: "egypt-gaza-humanitarian-convoy",
        summary: "Support our humanitarian convoy delivering essential supplies from Egypt to Gaza. Help us transport food, medicine, and emergency aid to those in need.",
        sectionIntro: "We are organizing a critical humanitarian convoy to transport essential supplies from Egypt into Gaza.",
        sectionNeed: "The border crossing requires careful coordination and resources to transport aid safely.",
        sectionFundsUsed: "Funds are used for convoy logistics, vehicle maintenance, fuel costs, and essential supplies.",
        sectionImpact: "Each convoy delivers thousands of essential items directly to families in Gaza.",
        isActive: true,
        donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "LILLAH"]),
        allowFundraising: true,
      },
    })
    console.log("Created Egypt to Gaza appeal")
  } else {
    // Update to enable fundraising
    egyptGazaAppeal = await prisma.appeal.update({
      where: { id: egyptGazaAppeal.id },
      data: { allowFundraising: true },
    })
    console.log("Updated Egypt to Gaza appeal - fundraising enabled")
  }

  // Create demo fundraiser
  const demoFundraiser = await prisma.fundraiser.upsert({
    where: { slug: "demo-egypt-gaza-fundraiser" },
    update: {},
    create: {
      appealId: egyptGazaAppeal.id,
      title: "Community Support for Gaza - Ramadan 2024",
      slug: "demo-egypt-gaza-fundraiser",
      fundraiserName: "Ahmed Hassan",
      email: "ahmed.hassan@example.com",
      message: "This Ramadan, I'm raising funds to support the Egypt to Gaza humanitarian convoy. Every donation helps transport essential supplies including food, medicine, and emergency aid to families in Gaza. Together, we can make a real difference in the lives of those who need it most. JazakAllah Khair for your support!",
      targetAmountPence: 500000, // £5,000 target
      isActive: true,
    },
  })

  // Create some demo donations for the fundraiser
  const demoDonor1 = await prisma.donor.upsert({
    where: { email: "sarah.ahmed@example.com" },
    update: {},
    create: {
      firstName: "Sarah",
      lastName: "Ahmed",
      email: "sarah.ahmed@example.com",
    },
  })

  const demoDonor2 = await prisma.donor.upsert({
    where: { email: "mohammed.ali@example.com" },
    update: {},
    create: {
      firstName: "Mohammed",
      lastName: "Ali",
      email: "mohammed.ali@example.com",
    },
  })

  const demoDonor3 = await prisma.donor.upsert({
    where: { email: "fatima.hassan@example.com" },
    update: {},
    create: {
      firstName: "Fatima",
      lastName: "Hassan",
      email: "fatima.hassan@example.com",
    },
  })

  // Create demo donations (check if they already exist first)
  const existingDonations = await prisma.donation.findMany({
    where: { fundraiserId: demoFundraiser.id },
  })

  if (existingDonations.length === 0) {
    await prisma.donation.createMany({
      data: [
        {
          donorId: demoDonor1.id,
          appealId: egyptGazaAppeal.id,
          fundraiserId: demoFundraiser.id,
          amountPence: 5000, // £50
          donationType: "GENERAL",
          frequency: "ONE_OFF",
          status: "COMPLETED",
          paymentMethod: "STRIPE",
          giftAid: true,
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        {
          donorId: demoDonor2.id,
          appealId: egyptGazaAppeal.id,
          fundraiserId: demoFundraiser.id,
          amountPence: 10000, // £100
          donationType: "SADAQAH",
          frequency: "ONE_OFF",
          status: "COMPLETED",
          paymentMethod: "STRIPE",
          giftAid: false,
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
        {
          donorId: demoDonor3.id,
          appealId: egyptGazaAppeal.id,
          fundraiserId: demoFundraiser.id,
          amountPence: 2500, // £25
          donationType: "LILLAH",
          frequency: "ONE_OFF",
          status: "COMPLETED",
          paymentMethod: "STRIPE",
          giftAid: true,
          completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        },
      ],
    })
    console.log("💰 Demo donations added: £50, £100, £25")
  } else {
    console.log("💰 Demo donations already exist")
  }

  console.log("\n✅ Demo data created successfully!")
  console.log("\n📋 URLs:")
  console.log(`   Fundraiser page: http://localhost:3000/fundraise/${demoFundraiser.slug}`)
  console.log(`   Create fundraiser: http://localhost:3000/fundraise/${egyptGazaAppeal.slug}`)
  console.log(`   Appeal page: http://localhost:3000/appeal/${egyptGazaAppeal.slug}`)
  console.log("\n💰 Demo donations added: £50, £100, £25")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
