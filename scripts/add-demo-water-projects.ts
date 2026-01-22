import { prisma } from "../lib/prisma"

async function main() {
  console.log("Adding demo water projects...")

  // First, ensure countries exist
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

  // Create or get countries
  const countryMap = new Map<string, string>()
  
  for (const countryData of countries) {
    let country = await prisma.waterProjectCountry.findFirst({
      where: {
        projectType: countryData.projectType,
        country: countryData.country,
      },
    })

    if (!country) {
      country = await prisma.waterProjectCountry.create({
        data: {
          ...countryData,
          isActive: true,
          sortOrder: 0,
        },
      })
      console.log(`Created country: ${countryData.projectType} - ${countryData.country}`)
    }

    countryMap.set(`${countryData.projectType}-${countryData.country}`, country.id)
  }

  // Now create water projects
  const projects = [
    // Water Pumps
    { projectType: "WATER_PUMP", country: "Sri Lanka", location: "Colombo District", amountPence: 12000 },
    { projectType: "WATER_PUMP", country: "Pakistan", location: "Lahore District", amountPence: 15000 },
    { projectType: "WATER_PUMP", country: "India", location: "Mumbai District", amountPence: 15000 },
    { projectType: "WATER_PUMP", country: "Bangladesh", location: "Dhaka District", amountPence: 30000 },
    
    // Water Wells
    { projectType: "WATER_WELL", country: "India", location: "Rajasthan Village", amountPence: 60000 },
    { projectType: "WATER_WELL", country: "Pakistan", location: "Sindh Province", amountPence: 75000 },
    { projectType: "WATER_WELL", country: "Tanzania", location: "Dodoma Region", amountPence: 120000 },
    { projectType: "WATER_WELL", country: "Zambia", location: "Lusaka Province", amountPence: 300000 },
    { projectType: "WATER_WELL", country: "Malawi", location: "Lilongwe District", amountPence: 400000 },
    
    // Water Tanks
    { projectType: "WATER_TANK", country: "Gaza", location: "Gaza City", amountPence: 50000 },
  ]

  for (const projectData of projects) {
    const countryId = countryMap.get(`${projectData.projectType}-${projectData.country}`)
    
    if (!countryId) {
      console.error(`Country not found for ${projectData.projectType} - ${projectData.country}`)
      continue
    }

    try {
      const project = await prisma.waterProject.create({
        data: {
          projectType: projectData.projectType,
          location: projectData.location,
          amountPence: projectData.amountPence,
          isActive: true,
          status: null,
          description: `Water ${projectData.projectType === "WATER_PUMP" ? "Pump" : projectData.projectType === "WATER_WELL" ? "Well" : "Tank"} project in ${projectData.location}, ${projectData.country}`,
        },
      })
      console.log(`✓ Created project: ${projectData.projectType} - ${projectData.country} - ${projectData.location} (£${(projectData.amountPence / 100).toFixed(2)}) - ID: ${project.id}`)
    } catch (error: any) {
      console.error(`✗ Error creating project ${projectData.location}:`, error.message || error)
      if (error.code) {
        console.error(`  Error code: ${error.code}`)
      }
    }
  }

  console.log("Demo water projects added successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
