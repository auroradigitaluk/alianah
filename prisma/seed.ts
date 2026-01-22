import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create products
  const orphanSponsorship = await prisma.product.upsert({
    where: { slug: "orphan-sponsorship-pakistan" },
    update: {},
    create: {
      name: "Orphan Sponsorship",
      slug: "orphan-sponsorship-pakistan",
      type: "FIXED",
      unitLabel: "per month",
      fixedAmountPence: 2000, // £20
      isActive: true,
    },
  })

  // Create appeals
  const palestineAppeal = await prisma.appeal.upsert({
    where: { slug: "palestine-emergency-relief" },
    update: {},
    create: {
      title: "Palestine Emergency Relief",
      slug: "palestine-emergency-relief",
      summary: "Urgent humanitarian aid for families in Palestine facing crisis. Your support provides essential food, medical supplies, and shelter.",
      sectionIntro: "The ongoing crisis in Palestine has left thousands of families in desperate need of immediate assistance. We are working on the ground to deliver critical aid to those most affected.",
      sectionNeed: "Families are struggling to access basic necessities including food, clean water, medical care, and safe shelter. Children are particularly vulnerable, with many unable to attend school or receive proper nutrition.",
      sectionFundsUsed: "Your donations directly fund emergency food parcels, medical supplies, clean water distribution, temporary shelter, and essential hygiene kits. Every contribution makes a real difference in the lives of those affected.",
      sectionImpact: "With your support, we have been able to reach hundreds of families with life-saving aid. Your generosity provides hope and practical assistance during these challenging times.",
      isActive: true,
      donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
      allowMonthly: true,
      allowYearly: true,
      monthlyPricePence: 2000, // £20
      yearlyPricePence: 24000, // £240
    },
  })

  const egyptGazaConvoy = await prisma.appeal.upsert({
    where: { slug: "egypt-gaza-humanitarian-convoy" },
    update: {
      allowFundraising: true,
    },
    create: {
      title: "Egypt to Gaza Humanitarian Convoy",
      slug: "egypt-gaza-humanitarian-convoy",
      summary: "Support our humanitarian convoy delivering essential supplies from Egypt to Gaza. Help us transport food, medicine, and emergency aid to those in need.",
      sectionIntro: "We are organizing a critical humanitarian convoy to transport essential supplies from Egypt into Gaza. This coordinated effort ensures aid reaches those who need it most.",
      sectionNeed: "The border crossing requires careful coordination and resources to transport aid safely. We need support for logistics, transportation, fuel, and essential supplies including food, medical equipment, and emergency shelter materials.",
      sectionFundsUsed: "Funds are used for convoy logistics, vehicle maintenance, fuel costs, border coordination fees, and the purchase of essential supplies including food parcels, medical kits, and emergency shelter materials.",
      sectionImpact: "Each convoy delivers thousands of essential items directly to families in Gaza. Your support ensures continuous aid delivery and helps maintain this vital lifeline for those in desperate need.",
      isActive: true,
      donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "LILLAH"]),
      allowMonthly: false,
      allowYearly: false,
      allowFundraising: true,
    },
  })

  const bulgariaAppeal = await prisma.appeal.upsert({
    where: { slug: "bulgaria-community-support" },
    update: {},
    create: {
      title: "Bulgaria Community Support",
      slug: "bulgaria-community-support",
      summary: "Supporting vulnerable communities in Bulgaria with food assistance, educational programs, and essential services for families in need.",
      sectionIntro: "Our community support program in Bulgaria provides essential assistance to families facing economic hardship and social challenges.",
      sectionNeed: "Many families struggle with food insecurity, lack of access to education, and limited healthcare resources. Children from disadvantaged backgrounds need support to access quality education and basic necessities.",
      sectionFundsUsed: "Donations fund food distribution programs, educational support including school supplies and tutoring, healthcare access, and community development initiatives that empower families.",
      sectionImpact: "Through your generous support, we've helped hundreds of families access regular meals, educational opportunities, and essential services. Your contributions create lasting positive change in these communities.",
      isActive: true,
      donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "LILLAH"]),
      allowMonthly: true,
      allowYearly: true,
      monthlyPricePence: 2000, // £20
      yearlyPricePence: 24000, // £240
    },
  })

  const indiaAppeal = await prisma.appeal.upsert({
    where: { slug: "india-education-and-healthcare" },
    update: {},
    create: {
      title: "India Education and Healthcare",
      slug: "india-education-and-healthcare",
      summary: "Empowering communities in India through education and healthcare initiatives. Supporting schools, medical clinics, and community development programs.",
      sectionIntro: "Our programs in India focus on creating sustainable change through education and healthcare access for underserved communities.",
      sectionNeed: "Many communities lack access to quality education and basic healthcare services. Children need school supplies, educational support, and access to medical care. Families require assistance with healthcare costs and educational expenses.",
      sectionFundsUsed: "Your donations support school infrastructure, educational materials, teacher training, medical clinic operations, healthcare supplies, and community health programs that serve thousands of people.",
      sectionImpact: "With your support, we've established educational programs serving hundreds of children and healthcare services reaching thousands of community members. Your generosity creates opportunities for lasting change.",
      isActive: true,
      donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
      allowMonthly: true,
      allowYearly: true,
      monthlyPricePence: 2000, // £20
      yearlyPricePence: 24000, // £240
    },
  })

  const orphanSponsorshipAppeal = await prisma.appeal.upsert({
    where: { slug: "orphan-sponsorship-pakistan" },
    update: {},
    create: {
      title: "Orphan Sponsorship - Pakistan",
      slug: "orphan-sponsorship-pakistan",
      summary: "Sponsor an orphan in Pakistan for £20 per month (£240 per year). Provide education, healthcare, food, and essential support to children in need.",
      sectionIntro: "Our orphan sponsorship program in Pakistan provides comprehensive support to vulnerable children, ensuring they have access to education, healthcare, nutrition, and a safe environment.",
      sectionNeed: "Orphaned children face significant challenges including lack of access to education, healthcare, proper nutrition, and emotional support. Many struggle to meet basic needs and miss out on opportunities that every child deserves.",
      sectionFundsUsed: "Your monthly sponsorship of £20 covers school fees, uniforms, books, healthcare, nutritious meals, clothing, and essential support services. Annual sponsorship of £240 provides comprehensive year-round support.",
      sectionImpact: "Each sponsored child receives consistent support that transforms their life. They gain access to education, healthcare, and opportunities that would otherwise be out of reach. Your sponsorship creates a lasting positive impact.",
      isActive: true,
      donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]),
      allowMonthly: true,
      allowYearly: true,
      monthlyPricePence: 2000, // £20
      yearlyPricePence: 24000, // £240
      products: {
        create: [
          {
            productId: orphanSponsorship.id,
            frequency: "MONTHLY",
            presetAmountsPence: JSON.stringify([2000]), // £20
            allowCustom: false,
            sortOrder: 0,
          },
          {
            productId: orphanSponsorship.id,
            frequency: "YEARLY",
            presetAmountsPence: JSON.stringify([24000]), // £240
            allowCustom: false,
            sortOrder: 0,
          },
        ],
      },
    },
  })

  // Create masjids
  const masjid1 = await prisma.masjid.create({
    data: {
      name: "Central Masjid",
      city: "London",
      address: "123 High Street, London, UK",
      contactName: "Ahmed Hassan",
      phone: "+44 20 1234 5678",
      email: "info@centralmasjid.org.uk",
    },
  })

  const masjid2 = await prisma.masjid.create({
    data: {
      name: "Al-Noor Masjid",
      city: "Birmingham",
      address: "456 Main Road, Birmingham, UK",
      contactName: "Fatima Ali",
      phone: "+44 121 9876 5432",
    },
  })

  // Add offline income
  const offlineIncomeData = [
    {
      appealId: palestineAppeal.id,
      amountPence: 50000, // £500
      donationType: "GENERAL",
      source: "BANK_TRANSFER",
      receivedAt: new Date("2024-01-10"),
      notes: "Bank transfer from donor",
    },
    {
      appealId: palestineAppeal.id,
      amountPence: 25000, // £250
      donationType: "ZAKAT",
      source: "CASH",
      receivedAt: new Date("2024-01-12"),
      notes: "Cash donation at masjid",
    },
    {
      appealId: egyptGazaConvoy.id,
      amountPence: 100000, // £1,000
      donationType: "GENERAL",
      source: "BANK_TRANSFER",
      receivedAt: new Date("2024-01-15"),
      notes: "Large donation for convoy",
    },
    {
      appealId: orphanSponsorshipAppeal.id,
      amountPence: 24000, // £240
      donationType: "SADAQAH",
      source: "BANK_TRANSFER",
      receivedAt: new Date("2024-01-08"),
      notes: "Annual orphan sponsorship",
    },
    {
      appealId: bulgariaAppeal.id,
      amountPence: 30000, // £300
      donationType: "LILLAH",
      source: "CASH",
      receivedAt: new Date("2024-01-14"),
    },
    {
      appealId: indiaAppeal.id,
      amountPence: 40000, // £400
      donationType: "GENERAL",
      source: "BANK_TRANSFER",
      receivedAt: new Date("2024-01-11"),
    },
    {
      appealId: palestineAppeal.id,
      amountPence: 15000, // £150
      donationType: "SADAQAH",
      source: "CASH",
      receivedAt: new Date("2024-01-13"),
    },
  ]

  for (const income of offlineIncomeData) {
    await prisma.offlineIncome.create({ data: income })
  }

  // Add collections
  const collectionsData = [
    {
      masjidId: masjid1.id,
      appealId: palestineAppeal.id,
      amountPence: 35000, // £350
      donationType: "GENERAL",
      type: "JUMMAH",
      collectedAt: new Date("2024-01-12"),
      notes: "Jummah collection",
    },
    {
      masjidId: masjid1.id,
      appealId: egyptGazaConvoy.id,
      amountPence: 45000, // £450
      donationType: "GENERAL",
      type: "JUMMAH",
      collectedAt: new Date("2024-01-19"),
      notes: "Jummah collection for convoy",
    },
    {
      masjidId: masjid2.id,
      appealId: orphanSponsorshipAppeal.id,
      amountPence: 20000, // £200
      donationType: "SADAQAH",
      type: "JUMMAH",
      collectedAt: new Date("2024-01-12"),
    },
    {
      masjidId: masjid1.id,
      appealId: bulgariaAppeal.id,
      amountPence: 25000, // £250
      donationType: "LILLAH",
      type: "SPECIAL",
      collectedAt: new Date("2024-01-20"),
      notes: "Special collection event",
    },
  ]

  for (const collection of collectionsData) {
    await prisma.collection.create({ data: collection })
  }

  // Create more masjids
  const masjid3 = await prisma.masjid.upsert({
    where: { id: "masjid3" },
    update: {},
    create: {
      id: "masjid3",
      name: "Al-Madinah Masjid",
      city: "Manchester",
      address: "789 Oxford Road, Manchester, UK",
      contactName: "Yusuf Khan",
      phone: "+44 161 555 1234",
      email: "info@almadinahmasjid.org.uk",
    },
  }).catch(async () => {
    return await prisma.masjid.findFirst({
      where: { name: "Al-Madinah Masjid", city: "Manchester" },
    }) || await prisma.masjid.create({
      data: {
        name: "Al-Madinah Masjid",
        city: "Manchester",
        address: "789 Oxford Road, Manchester, UK",
        contactName: "Yusuf Khan",
        phone: "+44 161 555 1234",
        email: "info@almadinahmasjid.org.uk",
      },
    })
  })

  const masjid4 = await prisma.masjid.findFirst({
    where: { name: "Ibrahim Masjid", city: "Leeds" },
  }) || await prisma.masjid.create({
    data: {
      name: "Ibrahim Masjid",
      city: "Leeds",
      address: "321 Park Lane, Leeds, UK",
      contactName: "Aisha Rahman",
      phone: "+44 113 555 5678",
    },
  })

  const masjid5 = await prisma.masjid.findFirst({
    where: { name: "Al-Aqsa Masjid", city: "Bradford" },
  }) || await prisma.masjid.create({
    data: {
      name: "Al-Aqsa Masjid",
      city: "Bradford",
      address: "654 High Street, Bradford, UK",
      contactName: "Mohammed Ali",
      phone: "+44 1274 555 9012",
      email: "contact@alaqsamasjid.org.uk",
    },
  })

  // Create more fundraisers
  const fundraiser1 = await prisma.fundraiser.upsert({
    where: { slug: "palestine-emergency-fundraiser" },
    update: {},
    create: {
      appealId: palestineAppeal.id,
      title: "Palestine Emergency Fundraiser",
      slug: "palestine-emergency-fundraiser",
      fundraiserName: "Community Relief Group",
      isActive: true,
    },
  })

  const fundraiser2 = await prisma.fundraiser.upsert({
    where: { slug: "orphan-sponsorship-campaign" },
    update: {},
    create: {
      appealId: orphanSponsorshipAppeal.id,
      title: "Orphan Sponsorship Campaign",
      slug: "orphan-sponsorship-campaign",
      fundraiserName: "Sarah Ahmed",
      isActive: true,
    },
  })

  const fundraiser3 = await prisma.fundraiser.upsert({
    where: { slug: "gaza-convoy-support" },
    update: {},
    create: {
      appealId: egyptGazaConvoy.id,
      title: "Gaza Convoy Support",
      slug: "gaza-convoy-support",
      fundraiserName: "Humanitarian Network",
      isActive: true,
    },
  })

  const fundraiser4 = await prisma.fundraiser.upsert({
    where: { slug: "india-education-drive" },
    update: {},
    create: {
      appealId: indiaAppeal.id,
      title: "India Education Drive",
      slug: "india-education-drive",
      fundraiserName: "Education Foundation",
      isActive: true,
    },
  })

  // Create donors
  const donor1 = await prisma.donor.upsert({
    where: { email: "ahmed.hassan@example.com" },
    update: {},
    create: {
      firstName: "Ahmed",
      lastName: "Hassan",
      email: "ahmed.hassan@example.com",
      phone: "+44 20 7123 4567",
      address: "10 Baker Street",
      city: "London",
      postcode: "NW1 6XE",
      country: "UK",
    },
  })

  const donor2 = await prisma.donor.upsert({
    where: { email: "fatima.ali@example.com" },
    update: {},
    create: {
      firstName: "Fatima",
      lastName: "Ali",
      email: "fatima.ali@example.com",
      phone: "+44 121 987 6543",
      address: "25 Victoria Road",
      city: "Birmingham",
      postcode: "B1 1AA",
      country: "UK",
    },
  })

  const donor3 = await prisma.donor.upsert({
    where: { email: "mohammed.khan@example.com" },
    update: {},
    create: {
      firstName: "Mohammed",
      lastName: "Khan",
      email: "mohammed.khan@example.com",
      phone: "+44 161 234 5678",
      address: "5 High Street",
      city: "Manchester",
      postcode: "M1 1AB",
      country: "UK",
    },
  })

  const donor4 = await prisma.donor.upsert({
    where: { email: "aisha.rahman@example.com" },
    update: {},
    create: {
      firstName: "Aisha",
      lastName: "Rahman",
      email: "aisha.rahman@example.com",
      phone: "+44 113 456 7890",
      city: "Leeds",
      country: "UK",
    },
  })

  const donor5 = await prisma.donor.upsert({
    where: { email: "yusuf.ahmed@example.com" },
    update: {},
    create: {
      firstName: "Yusuf",
      lastName: "Ahmed",
      email: "yusuf.ahmed@example.com",
      phone: "+44 20 7654 3210",
      address: "15 Park Avenue",
      city: "London",
      postcode: "SW1A 1AA",
      country: "UK",
    },
  })

  // Create donations (delete existing first to avoid duplicates)
  await prisma.donation.deleteMany({})
  await prisma.recurringDonation.deleteMany({})
  const donationsData = [
    {
      donorId: donor1.id,
      appealId: palestineAppeal.id,
      amountPence: 5000, // £50
      donationType: "GENERAL",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "STRIPE",
      transactionId: "ch_1234567890",
      giftAid: true,
      completedAt: new Date("2024-01-15"),
    },
    {
      donorId: donor2.id,
      appealId: orphanSponsorshipAppeal.id,
      productId: orphanSponsorship.id,
      amountPence: 2000, // £20
      donationType: "SADAQAH",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "STRIPE",
      transactionId: "ch_1234567891",
      giftAid: false,
      completedAt: new Date("2024-01-16"),
    },
    {
      donorId: donor3.id,
      appealId: egyptGazaConvoy.id,
      amountPence: 10000, // £100
      donationType: "GENERAL",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "STRIPE",
      transactionId: "ch_1234567892",
      giftAid: true,
      completedAt: new Date("2024-01-17"),
    },
    {
      donorId: donor4.id,
      appealId: bulgariaAppeal.id,
      amountPence: 3000, // £30
      donationType: "LILLAH",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "STRIPE",
      transactionId: "ch_1234567893",
      giftAid: false,
      completedAt: new Date("2024-01-18"),
    },
    {
      donorId: donor5.id,
      appealId: indiaAppeal.id,
      amountPence: 7500, // £75
      donationType: "GENERAL",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "STRIPE",
      transactionId: "ch_1234567894",
      giftAid: true,
      completedAt: new Date("2024-01-19"),
    },
    {
      donorId: donor1.id,
      appealId: palestineAppeal.id,
      amountPence: 2500, // £25
      donationType: "ZAKAT",
      frequency: "ONE_OFF",
      status: "COMPLETED",
      paymentMethod: "STRIPE",
      transactionId: "ch_1234567895",
      giftAid: false,
      completedAt: new Date("2024-01-20"),
    },
    {
      donorId: donor2.id,
      appealId: orphanSponsorshipAppeal.id,
      amountPence: 1500, // £15
      donationType: "SADAQAH",
      frequency: "ONE_OFF",
      status: "PENDING",
      paymentMethod: "STRIPE",
      giftAid: true,
    },
  ]

  for (const donation of donationsData) {
    await prisma.donation.create({ data: donation })
  }

  // Add more fake donations spread across the last 90 days for chart data
  const now = new Date()
  const fakeDonationsData = []
  
  // Generate donations for the last 90 days
  for (let i = 0; i < 90; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Vary the number of donations per day (0-5 donations per day)
    const donationsPerDay = Math.floor(Math.random() * 6)
    
    for (let j = 0; j < donationsPerDay; j++) {
      const donorIndex = Math.floor(Math.random() * 5) + 1
      const appealIndex = Math.floor(Math.random() * 5) + 1
      const appeals = [palestineAppeal, egyptGazaConvoy, bulgariaAppeal, indiaAppeal, orphanSponsorshipAppeal]
      const selectedAppeal = appeals[appealIndex - 1]
      const donors = [donor1, donor2, donor3, donor4, donor5]
      const selectedDonor = donors[donorIndex - 1]
      
      // Random amount between £10 and £500
      const amountPence = Math.floor(Math.random() * 49000) + 1000
      
      // Random donation type
      const donationTypes = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]
      const donationType = donationTypes[Math.floor(Math.random() * donationTypes.length)]
      
      // Random status (mostly completed, some pending)
      const status = Math.random() > 0.1 ? "COMPLETED" : "PENDING"
      
      const donationDate = new Date(date)
      donationDate.setHours(Math.floor(Math.random() * 24))
      donationDate.setMinutes(Math.floor(Math.random() * 60))
      
      fakeDonationsData.push({
        donorId: selectedDonor.id,
        appealId: selectedAppeal.id,
        amountPence,
        donationType,
        frequency: "ONE_OFF",
        status,
        paymentMethod: "STRIPE",
        transactionId: `ch_fake_${i}_${j}_${Date.now()}`,
        giftAid: Math.random() > 0.5,
        createdAt: donationDate,
        completedAt: status === "COMPLETED" ? donationDate : null,
      })
    }
  }
  
  // Add fake offline income for the last 90 days
  const fakeOfflineIncomeData = []
  for (let i = 0; i < 60; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - Math.floor(Math.random() * 90))
    
    const appealIndex = Math.floor(Math.random() * 5) + 1
    const appeals = [palestineAppeal, egyptGazaConvoy, bulgariaAppeal, indiaAppeal, orphanSponsorshipAppeal]
    const selectedAppeal = appeals[appealIndex - 1]
    
    const amountPence = Math.floor(Math.random() * 100000) + 5000 // £50 - £1000
    const donationTypes = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]
    const donationType = donationTypes[Math.floor(Math.random() * donationTypes.length)]
    const sources = ["CASH", "BANK_TRANSFER"]
    const source = sources[Math.floor(Math.random() * sources.length)]
    
    fakeOfflineIncomeData.push({
      appealId: selectedAppeal.id,
      amountPence,
      donationType,
      source,
      receivedAt: date,
      notes: `Fake offline income entry ${i + 1}`,
    })
  }
  
  // Add fake collections for the last 90 days
  const fakeCollectionsData = []
  const masjids = [masjid1, masjid2, masjid3, masjid4, masjid5]
  
  for (let i = 0; i < 40; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - Math.floor(Math.random() * 90))
    
    const masjidIndex = Math.floor(Math.random() * 5)
    const selectedMasjid = masjids[masjidIndex]
    
    const appealIndex = Math.floor(Math.random() * 5) + 1
    const appeals = [palestineAppeal, egyptGazaConvoy, bulgariaAppeal, indiaAppeal, orphanSponsorshipAppeal]
    const selectedAppeal = appeals[appealIndex - 1]
    
    const amountPence = Math.floor(Math.random() * 50000) + 10000 // £100 - £500
    const donationTypes = ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"]
    const donationType = donationTypes[Math.floor(Math.random() * donationTypes.length)]
    const collectionTypes = ["JUMMAH", "RAMADAN", "EID", "SPECIAL", "OTHER"]
    const collectionType = collectionTypes[Math.floor(Math.random() * collectionTypes.length)]
    
    fakeCollectionsData.push({
      masjidId: selectedMasjid.id,
      appealId: selectedAppeal.id,
      amountPence,
      donationType,
      type: collectionType,
      collectedAt: date,
      notes: `Fake collection entry ${i + 1}`,
    })
  }
  
  // Create all fake data
  for (const donation of fakeDonationsData) {
    await prisma.donation.create({ data: donation }).catch(() => {}) // Ignore duplicates
  }
  
  for (const income of fakeOfflineIncomeData) {
    await prisma.offlineIncome.create({ data: income }).catch(() => {}) // Ignore duplicates
  }
  
  for (const collection of fakeCollectionsData) {
    await prisma.collection.create({ data: collection }).catch(() => {}) // Ignore duplicates
  }

  // Create recurring donations
  const recurringDonationsData = [
    {
      donorId: donor1.id,
      appealId: orphanSponsorshipAppeal.id,
      productId: orphanSponsorship.id,
      amountPence: 2000, // £20
      donationType: "SADAQAH",
      frequency: "MONTHLY",
      status: "ACTIVE",
      paymentMethod: "STRIPE",
      subscriptionId: "sub_1234567890",
      nextPaymentDate: new Date("2024-02-15"),
      lastPaymentDate: new Date("2024-01-15"),
    },
    {
      donorId: donor2.id,
      appealId: palestineAppeal.id,
      amountPence: 5000, // £50
      donationType: "GENERAL",
      frequency: "MONTHLY",
      status: "ACTIVE",
      paymentMethod: "STRIPE",
      subscriptionId: "sub_1234567891",
      nextPaymentDate: new Date("2024-02-16"),
      lastPaymentDate: new Date("2024-01-16"),
    },
    {
      donorId: donor3.id,
      appealId: bulgariaAppeal.id,
      amountPence: 1000, // £10
      donationType: "LILLAH",
      frequency: "MONTHLY",
      status: "ACTIVE",
      paymentMethod: "STRIPE",
      subscriptionId: "sub_1234567892",
      nextPaymentDate: new Date("2024-02-17"),
      lastPaymentDate: new Date("2024-01-17"),
    },
    {
      donorId: donor4.id,
      appealId: orphanSponsorshipAppeal.id,
      productId: orphanSponsorship.id,
      amountPence: 24000, // £240
      donationType: "SADAQAH",
      frequency: "YEARLY",
      status: "ACTIVE",
      paymentMethod: "STRIPE",
      subscriptionId: "sub_1234567893",
      nextPaymentDate: new Date("2025-01-18"),
      lastPaymentDate: new Date("2024-01-18"),
    },
    {
      donorId: donor5.id,
      appealId: indiaAppeal.id,
      amountPence: 3000, // £30
      donationType: "GENERAL",
      frequency: "MONTHLY",
      status: "PAUSED",
      paymentMethod: "STRIPE",
      subscriptionId: "sub_1234567894",
      nextPaymentDate: new Date("2024-02-19"),
      lastPaymentDate: new Date("2024-01-19"),
    },
  ]

  for (const recurring of recurringDonationsData) {
    await prisma.recurringDonation.create({ data: recurring })
  }

  // Add more collections
  const moreCollectionsData = [
    {
      masjidId: masjid3.id,
      appealId: palestineAppeal.id,
      amountPence: 40000, // £400
      donationType: "GENERAL",
      type: "JUMMAH",
      collectedAt: new Date("2024-01-26"),
      notes: "Jummah collection",
    },
    {
      masjidId: masjid4.id,
      appealId: orphanSponsorshipAppeal.id,
      amountPence: 30000, // £300
      donationType: "SADAQAH",
      type: "JUMMAH",
      collectedAt: new Date("2024-01-26"),
    },
    {
      masjidId: masjid5.id,
      appealId: egyptGazaConvoy.id,
      amountPence: 50000, // £500
      donationType: "GENERAL",
      type: "RAMADAN",
      collectedAt: new Date("2024-01-28"),
      notes: "Ramadan collection",
    },
    {
      masjidId: masjid3.id,
      appealId: indiaAppeal.id,
      amountPence: 20000, // £200
      donationType: "LILLAH",
      type: "SPECIAL",
      collectedAt: new Date("2024-01-30"),
      notes: "Special event collection",
    },
  ]

  for (const collection of moreCollectionsData) {
    await prisma.collection.create({ data: collection })
  }

  // Create demo fundraiser for Egypt to Gaza appeal
  const demoFundraiser = await prisma.fundraiser.upsert({
    where: { slug: "demo-egypt-gaza-fundraiser" },
    update: {},
    create: {
      appealId: egyptGazaConvoy.id,
      title: "Community Support for Gaza - Ramadan 2024",
      slug: "demo-egypt-gaza-fundraiser",
      fundraiserName: "Ahmed Hassan",
      email: "ahmed.hassan@example.com",
      message: "This Ramadan, I'm raising funds to support the Egypt to Gaza humanitarian convoy. Every donation helps transport essential supplies including food, medicine, and emergency aid to families in Gaza. Together, we can make a real difference in the lives of those who need it most. JazakAllah Khair for your support!",
      targetAmountPence: 500000, // £5,000 target
      isActive: true,
    },
  })

  console.log("Database seeded successfully!")
  console.log(`Demo fundraiser created: /fundraise/${demoFundraiser.slug}`)
  console.log(`Fundraiser creation page: /fundraise/${egyptGazaConvoy.slug}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
