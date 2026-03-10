import { NextResponse } from "next/server"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"

/** Returns the current fundraiser session email if logged in. */
export async function GET() {
  const email = await getFundraiserEmail()
  if (!email) {
    return NextResponse.json({ email: null }, { status: 200 })
  }
  return NextResponse.json({ email })
}
