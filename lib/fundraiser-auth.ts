import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function getFundraiserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("fundraiser_session")?.value
    
    if (!sessionToken) {
      return null
    }

    // Get email from separate cookie
    const emailCookie = cookieStore.get("fundraiser_email")?.value
    
    if (!emailCookie) {
      return null
    }

    // Return the email - no need to verify fundraisers exist
    // They might be logging in to create their first one
    return emailCookie
  } catch (error) {
    console.error("Error getting fundraiser email:", error)
    return null
  }
}

export async function requireFundraiserAuth(): Promise<string> {
  const email = await getFundraiserEmail()
  
  if (!email) {
    throw new Error("Unauthorized")
  }
  
  return email
}
