import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const sponsorshipTypes = ["ORPHANS", "HIFZ", "FAMILIES"] as const
  for (const projectType of sponsorshipTypes) {
    const existing = await prisma.sponsorshipProject.findUnique({
      where: { projectType },
    })
    if (!existing) {
      await prisma.sponsorshipProject.create({
        data: { projectType, isActive: true },
      })
      console.log(`Created sponsorship project: ${projectType}`)
    }
  }

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
