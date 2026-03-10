import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"
import { z } from "zod"

export const dynamic = "force-dynamic"

/** Get profile for the logged-in fundraiser (session email). Returns 404 if no profile. */
export async function GET() {
  const email = await getFundraiserEmail()
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.fundraiserProfile.findUnique({
    where: { email },
  })

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  return NextResponse.json({
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
  })
}

const updateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
})

/** Create or update profile for the logged-in fundraiser. */
export async function PATCH(request: NextRequest) {
  const email = await getFundraiserEmail()
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const profile = await prisma.fundraiserProfile.upsert({
      where: { email },
      create: {
        email,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      },
      update: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      },
    })

    return NextResponse.json({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Profile PATCH error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
