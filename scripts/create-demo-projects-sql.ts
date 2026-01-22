import { execSync } from "child_process"
import { readFileSync } from "fs"

const dbPath = "./prisma/dev.db"

// Get country IDs
const getCountryId = (projectType: string, country: string): string => {
  const result = execSync(
    `sqlite3 ${dbPath} "SELECT id FROM water_project_countries WHERE projectType = '${projectType}' AND country = '${country}' LIMIT 1;"`,
    { encoding: "utf-8" }
  ).trim()
  return result
}

const projects = [
  { projectType: "WATER_PUMP", country: "Sri Lanka", location: "Colombo District", amountPence: 12000 },
  { projectType: "WATER_PUMP", country: "Pakistan", location: "Lahore District", amountPence: 15000 },
  { projectType: "WATER_PUMP", country: "India", location: "Mumbai District", amountPence: 15000 },
  { projectType: "WATER_PUMP", country: "Bangladesh", location: "Dhaka District", amountPence: 30000 },
  { projectType: "WATER_WELL", country: "India", location: "Rajasthan Village", amountPence: 60000 },
  { projectType: "WATER_WELL", country: "Pakistan", location: "Sindh Province", amountPence: 75000 },
  { projectType: "WATER_WELL", country: "Tanzania", location: "Dodoma Region", amountPence: 120000 },
  { projectType: "WATER_WELL", country: "Zambia", location: "Lusaka Province", amountPence: 300000 },
  { projectType: "WATER_WELL", country: "Malawi", location: "Lilongwe District", amountPence: 400000 },
  { projectType: "WATER_TANK", country: "Gaza", location: "Gaza City", amountPence: 50000 },
]

console.log("Creating demo water projects...")

for (const project of projects) {
  try {
    const countryId = getCountryId(project.projectType, project.country)
    if (!countryId) {
      console.error(`Country not found: ${project.projectType} - ${project.country}`)
      continue
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const description = `Water ${project.projectType === "WATER_PUMP" ? "Pump" : project.projectType === "WATER_WELL" ? "Well" : "Tank"} project in ${project.location}, ${project.country}`
    
    const sql = `INSERT INTO water_projects (id, projectType, countryId, location, description, isActive, status, amountPence, completionImages, createdAt, updatedAt) VALUES ('${id}', '${project.projectType}', '${countryId}', '${project.location.replace(/'/g, "''")}', '${description.replace(/'/g, "''")}', 1, NULL, ${project.amountPence}, '[]', datetime('now'), datetime('now'));`
    
    execSync(`sqlite3 ${dbPath} "${sql}"`, { encoding: "utf-8" })
    console.log(`✓ Created: ${project.projectType} - ${project.country} - ${project.location} (£${(project.amountPence / 100).toFixed(2)})`)
  } catch (error: any) {
    console.error(`✗ Error creating ${project.location}:`, error.message)
  }
}

const count = execSync(`sqlite3 ${dbPath} "SELECT COUNT(*) FROM water_projects;"`, { encoding: "utf-8" }).trim()
console.log(`\nTotal projects in database: ${count}`)
