import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const testEmail = "test@test.com"
  const testPassword = "demo123"
  const existingTest = await prisma.adminUser.findUnique({
    where: { email: testEmail },
  })
  if (!existingTest) {
    const passwordHash = await bcrypt.hash(testPassword, 10)
    await prisma.adminUser.create({
      data: {
        email: testEmail,
        role: "ADMIN",
        passwordHash,
        twoFactorEnabled: false,
      },
    })
    console.log(`Created admin user: ${testEmail} (password: ${testPassword})`)
  } else {
    const passwordHash = await bcrypt.hash(testPassword, 10)
    await prisma.adminUser.update({
      where: { email: testEmail },
      data: {
        passwordHash,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        inviteToken: null,
        inviteExpiresAt: null,
      },
    })
    console.log(`Ensured demo account: ${testEmail} (password: ${testPassword}, 2FA off)`)
  }

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
