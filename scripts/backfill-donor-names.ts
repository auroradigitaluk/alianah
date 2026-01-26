import { prisma } from "../lib/prisma"

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return { firstName: value.trim(), lastName: "" }
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  }
}

async function backfillDonorNames() {
  const candidates = await prisma.donor.findMany({
    where: {
      lastName: "",
      firstName: {
        contains: " ",
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  })

  if (candidates.length === 0) {
    console.log("No donor names to backfill.")
    return
  }

  let updated = 0
  for (const donor of candidates) {
    const { firstName, lastName } = splitName(donor.firstName)
    if (!lastName) continue

    await prisma.donor.update({
      where: { id: donor.id },
      data: {
        firstName,
        lastName,
      },
    })
    updated += 1
  }

  console.log(`Updated ${updated} donor records.`)
}

backfillDonorNames()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error("Failed to backfill donor names:", error)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
