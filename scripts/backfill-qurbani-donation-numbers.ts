import { prisma } from "../lib/prisma"
import { generateDonationNumber } from "../lib/donation-number"

/** Assigns 786-1######## donation numbers to historical qurbani rows missing them. Idempotent. */
async function backfillQurbaniDonationNumbers() {
  const rows = await prisma.qurbaniDonation.findMany({
    where: { donationNumber: null },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })

  if (rows.length === 0) {
    console.log("No qurbani donations missing donationNumber.")
    return
  }

  let updated = 0
  for (const row of rows) {
    const donationNumber = await generateDonationNumber()
    await prisma.qurbaniDonation.update({
      where: { id: row.id },
      data: { donationNumber },
    })
    updated += 1
    if (updated % 50 === 0) {
      console.log(`… ${updated} / ${rows.length}`)
    }
  }

  console.log(`Updated ${updated} qurbani donation record(s).`)
}

backfillQurbaniDonationNumbers()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error("Failed to backfill qurbani donation numbers:", error)
    return prisma.$disconnect().finally(() => process.exit(1))
  })
