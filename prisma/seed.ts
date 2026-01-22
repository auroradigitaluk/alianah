import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")
  // Seed file is empty - no demo data will be created
  // Add your own data through the admin interface or API
  console.log("Database seeded successfully! (No data created)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
