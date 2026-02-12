import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"

const SESSION_COOKIE = "fundraiser_session"
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

function getFundraiserSessionSecret(): string {
  const secret =
    process.env.FUNDRAISER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") return ""
    return "dev-fundraiser-secret-change-in-production"
  }
  return secret
}

function signFundraiserSession(payload: { email: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = createHmac("sha256", getFundraiserSessionSecret())
    .update(data)
    .digest("base64url")
  return `${data}.${sig}`
}

function verifyFundraiserSession(
  token: string
): { email: string; exp: number } | null {
  const secret = getFundraiserSessionSecret()
  if (!secret) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [data, sig] = parts
  const expected = createHmac("sha256", secret).update(data).digest("base64url")
  try {
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      return null
    }
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as { email: string; exp: number }
    if (typeof payload.email !== "string" || typeof payload.exp !== "number")
      return null
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export async function getFundraiserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionToken) return null

    const payload = verifyFundraiserSession(sessionToken)
    if (!payload) return null

    return payload.email.trim().toLowerCase()
  } catch (error) {
    console.error("Error getting fundraiser email:", error)
    return null
  }
}

export function createFundraiserSessionToken(email: string): string {
  const exp = Date.now() + SESSION_MAX_AGE * 1000
  return signFundraiserSession({
    email: email.trim().toLowerCase(),
    exp,
  })
}

export async function requireFundraiserAuth(): Promise<string> {
  const email = await getFundraiserEmail()
  
  if (!email) {
    throw new Error("Unauthorized")
  }
  
  return email
}
