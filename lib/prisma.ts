import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Validate DATABASE_URL is set and has correct format
// This helps catch configuration issues early
// Only validate when actually creating the client, not at module load time
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

// Create Prisma client with lazy validation
// Only validate when the client is actually created, not at module load time
// This allows the build to complete without requiring DATABASE_URL
function createPrismaClient() {
  // Skip validation during build phase - Next.js will try to collect page data
  // which imports this module, but DATABASE_URL may not be available yet
  const isBuildPhase = 
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build" ||
    (process.env.VERCEL === "1" && !process.env.DATABASE_URL) ||
    process.env.NODE_ENV === "production" && !process.env.DATABASE_URL
  
  // Only validate in runtime when actually needed, not during build
  if (!isBuildPhase && typeof window === "undefined") {
    validateDatabaseUrl()
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

// Force new instance to avoid caching issues. In development, if the cached
// client is missing a delegate (e.g. after schema change + prisma generate
// without restart), use a fresh client so new models are available.
function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (process.env.NODE_ENV !== "production" && cached != null) {
    // Stale client may lack new models (e.g. after schema change + prisma generate)
    if (
      !("fundraiserCashDonation" in cached) ||
      !("volunteer" in cached) ||
      !("collectionBooking" in cached)
    ) {
      globalForPrisma.prisma = undefined
    }
  }
  const client = globalForPrisma.prisma ?? createPrismaClient()
  if (process.env.NODE_ENV !== "production" && !globalForPrisma.prisma) {
    globalForPrisma.prisma = client
  }
  return client
}

// In development, use a proxy so that after invalidatePrismaCache() the next
// access gets a fresh client (avoids restart when schema + prisma generate happened).
const prismaInstance = getPrismaClient()
export const prisma =
  process.env.NODE_ENV !== "production"
    ? new Proxy(prismaInstance, {
        get(_target, prop) {
          return (getPrismaClient() as unknown as Record<string, unknown>)[prop as string]
        },
      })
    : prismaInstance

/** Call after detecting a stale Prisma client (e.g. Unknown argument for new fields). Next request will use a fresh client. */
export function invalidatePrismaCache(): void {
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = undefined
  }
}
