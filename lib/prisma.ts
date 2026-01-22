import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Validate DATABASE_URL is set and has correct format
// This helps catch configuration issues early
function validateDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL
  
  if (!dbUrl) {
    const error = new Error(
      "DATABASE_URL environment variable is not set. Please check your .env file and restart the dev server."
    )
    console.error("❌ DATABASE_URL is not set.")
    console.error("   Make sure your .env file exists and contains DATABASE_URL")
    console.error("   Then restart the dev server: npm run dev")
    throw error
  }

  if (
    !dbUrl.startsWith("postgresql://") &&
    !dbUrl.startsWith("postgres://")
  ) {
    const error = new Error(
      `Invalid DATABASE_URL format. Expected postgresql:// or postgres://`
    )
    console.error(`❌ Invalid DATABASE_URL format. Expected postgresql:// or postgres://`)
    console.error(`   Got: ${dbUrl.substring(0, 50)}...`)
    console.error("   Please check your .env file and restart the dev server")
    throw error
  }
  
  return dbUrl
}

// Validate before creating Prisma client
validateDatabaseUrl()

// Force new instance to avoid caching issues
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

// Disconnect and reconnect to ensure fresh connection
if (process.env.NODE_ENV !== "production") {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma
  }
}
