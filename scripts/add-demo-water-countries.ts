import { prisma } from "../lib/prisma"

async function main() {
  console.log("Adding demo water project countries...")

  const countries = [
    // Water Pumps
    { projectType: "WATER_PUMP", country: "Sri Lanka", pricePence: 12000 },
    { projectType: "WATER_PUMP", country: "Pakistan", pricePence: 15000 },
    { projectType: "WATER_PUMP", country: "India", pricePence: 15000 },
    { projectType: "WATER_PUMP", country: "Bangladesh", pricePence: 30000 },
    
    // Water Wells
    { projectType: "WATER_WELL", country: "India", pricePence: 60000 },
    { projectType: "WATER_WELL", country: "Pakistan", pricePence: 75000 },
    { projectType: "WATER_WELL", country: "Tanzania", pricePence: 120000 },
    { projectType: "WATER_WELL", country: "Zambia", pricePence: 300000 },
    { projectType: "WATER_WELL", country: "Malawi", pricePence: 400000 },
    
    // Water Tanks
    { projectType: "WATER_TANK", country: "Gaza", pricePence: 50000 },
  ]

  for (const countryData of countries) {
    try {
      // Check if country already exists
      const existing = await prisma.waterProjectCountry.findFirst({
        where: {
          projectType: countryData.projectType,
          country: countryData.country,
        },
      })

      if (existing) {
        // Update existing
        await prisma.waterProjectCountry.update({
          where: { id: existing.id },
          data: { pricePence: countryData.pricePence },
        })
        console.log(`Updated: ${countryData.projectType} - ${countryData.country} (£${(countryData.pricePence / 100).toFixed(2)})`)
      } else {
        // Create new
        await prisma.waterProjectCountry.create({
          data: {
            ...countryData,
            isActive: true,
            sortOrder: 0,
          },
        })
        console.log(`Created: ${countryData.projectType} - ${countryData.country} (£${(countryData.pricePence / 100).toFixed(2)})`)
      }
    } catch (error) {
      console.error(`Error adding ${countryData.country}:`, error)
    }
  }

  console.log("Demo countries added successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
