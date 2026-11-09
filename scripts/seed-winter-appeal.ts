/**
 * Seeds the Winter Appeal + its fixed-price items.
 * Safe to re-run: only CREATES what is missing, never edits/deletes existing rows.
 * Uses existing tables (appeals, products, appeal_products) — no schema changes.
 *
 * Run: npm run db:seed-winter
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const APPEAL_SLUG = "winter-appeal"

// Prices as supplied by client (stored in pence, shown in site currency).
const ITEMS: { name: string; price: number }[] = [
  { name: "Children's Winter Tracksuit – Type 1", price: 11.23 },
  { name: "Children's Winter Tracksuit – Type 2", price: 14.44 },
  { name: "Children's Winter Tracksuit – Type 3", price: 16.05 },
  { name: "Children's Jacket – Type 1", price: 12.84 },
  { name: "Children's Jacket – Type 2", price: 16.05 },
  { name: "Adult Winter Tracksuit", price: 17.65 },
  { name: "Adult Jacket", price: 24.07 },
  { name: "High-Quality Tarpaulin", price: 57.77 },
  { name: "High-Quality Blanket", price: 28.89 },
  { name: "High-Quality Mattress", price: 25.68 },
  { name: "Tent – Type 1", price: 224.66 },
  { name: "Tent – Type 2", price: 433.38 },
  { name: "Tent – Type 3", price: 609.8 },
]

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

async function main() {
  let appeal = await prisma.appeal.findUnique({ where: { slug: APPEAL_SLUG } })
  if (!appeal) {
    appeal = await prisma.appeal.create({
      data: {
        title: "Winter Appeal",
        slug: APPEAL_SLUG,
        summary: "Keep families warm this winter with tracksuits, jackets, blankets, mattresses, tarpaulins and tents.",
        sectionIntro: "",
        sectionNeed: "",
        sectionFundsUsed: "",
        sectionImpact: "",
        // Hidden from listings until an admin reviews and switches it on.
        isActive: false,
        showOnDonationForm: false,
        showOnZakatPage: false,
        donationTypesEnabled: JSON.stringify(["GENERAL", "SADAQAH", "ZAKAT"]),
        defaultDonationType: "GENERAL",
        oneOffPresetAmountsPence: JSON.stringify([2500, 5000, 10000, 25000]),
      },
    })
    console.log(`Created appeal: ${appeal.title} (${appeal.id})`)
  } else {
    console.log(`Appeal exists: ${appeal.title} (${appeal.id}) — only adding missing items`)
  }

  for (const [index, item] of ITEMS.entries()) {
    const slug = `${APPEAL_SLUG}-${slugify(item.name)}`
    if (await prisma.product.findUnique({ where: { slug } })) {
      console.log(`  skip (exists): ${item.name}`)
      continue
    }
    await prisma.product.create({
      data: {
        name: item.name,
        slug,
        type: "FIXED",
        unitLabel: "item",
        fixedAmountPence: Math.round(item.price * 100),
        isActive: true,
        appeals: {
          create: {
            appealId: appeal.id,
            frequency: "ONE_OFF",
            presetAmountsPence: "[]",
            allowCustom: false,
            sortOrder: index,
          },
        },
      },
    })
    console.log(`  added: ${item.name} @ ${item.price.toFixed(2)}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
