import { config } from "dotenv"
import { PrismaClient } from "@prisma/client"

// Load environment variables
config()

const prisma = new PrismaClient()

async function main() {
  console.log("Clearing all data from database...")
  
  // Delete in order to respect foreign key constraints
  await prisma.auditLog.deleteMany({})
  await prisma.waterProjectDonation.deleteMany({})
  await prisma.waterProjectCountry.deleteMany({})
  await prisma.waterProject.deleteMany({})
  await prisma.demoOrderItem.deleteMany({})
  await prisma.demoOrder.deleteMany({})
  await prisma.recurringDonation.deleteMany({})
  await prisma.donation.deleteMany({})
  await prisma.collection.deleteMany({})
  await prisma.offlineIncome.deleteMany({})
  await prisma.fundraiser.deleteMany({})
  await prisma.appealProduct.deleteMany({})
  await prisma.appeal.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.masjid.deleteMany({})
  await prisma.donor.deleteMany({})
  await prisma.adminUser.deleteMany({})
  
  console.log("All data cleared successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
