/**
 * For each checkout (OrderNumber:... in notes), if any qurbani line has fundraiserId,
 * apply that fundraiser to all lines in the same checkout. Idempotent.
 */
import { PrismaClient } from "@prisma/client"
import { orderNumberFromNotes } from "../lib/qurbani-checkout"

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.qurbaniDonation.findMany({
    where: { notes: { contains: "OrderNumber:" } },
    select: { id: true, notes: true, fundraiserId: true },
  })

  const byCheckout = new Map<string, typeof rows>()
  for (const row of rows) {
    const checkout = orderNumberFromNotes(row.notes)
    if (!checkout) continue
    const group = byCheckout.get(checkout) ?? []
    group.push(row)
    byCheckout.set(checkout, group)
  }

  let updated = 0
  for (const group of byCheckout.values()) {
    const fundraiserIds = new Set(
      group.map((r) => r.fundraiserId).filter((id): id is string => Boolean(id))
    )
    if (fundraiserIds.size !== 1) continue
    const fundraiserId = [...fundraiserIds][0]
    for (const row of group) {
      if (row.fundraiserId === fundraiserId) continue
      await prisma.qurbaniDonation.update({
        where: { id: row.id },
        data: { fundraiserId },
      })
      updated++
    }
  }

  console.log(
    `Checked ${rows.length} qurbani row(s) across ${byCheckout.size} checkout(s); updated ${updated} fundraiser attribution(s).`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
