/**
 * Sets qurbaniDonation.donationNumber to the checkout order reference for rows
 * created from the same Stripe session (notes contain OrderNumber:...).
 * Idempotent; safe to re-run.
 */
import { PrismaClient } from "@prisma/client"
import { orderNumberFromNotes } from "../lib/qurbani-checkout"

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.qurbaniDonation.findMany({
    where: { notes: { contains: "OrderNumber:" } },
    select: { id: true, notes: true, donationNumber: true },
  })

  let updated = 0
  for (const row of rows) {
    const checkout = orderNumberFromNotes(row.notes)
    if (!checkout || row.donationNumber === checkout) continue
    await prisma.qurbaniDonation.update({
      where: { id: row.id },
      data: { donationNumber: checkout },
    })
    updated++
  }

  console.log(
    `Checked ${rows.length} online qurbani row(s); updated ${updated} to use checkout donation number.`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
