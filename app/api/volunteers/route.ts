import { NextRequest, NextResponse } from "next/server"
import { prisma, invalidatePrismaCache } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required").max(50),
  city: z.string().min(1, "City is required").max(100),
  dateOfBirth: z.string().min(1, "Date of birth is required").max(50), // YYYY-MM-DD from form
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
  if (body == null || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    )
  }
  try {
    const data = signUpSchema.parse(body)

    const d = new Date(data.dateOfBirth.trim())
    const dateOfBirth = isNaN(d.getTime()) ? null : d
    if (!dateOfBirth) {
      return NextResponse.json(
        { error: "Invalid date of birth" },
        { status: 400 }
      )
    }

    // Ensure Prisma client has volunteer model (e.g. after schema + generate)
    invalidatePrismaCache()
    const client = prisma as { volunteer?: { create: (args: unknown) => Promise<unknown> } }
    if (!client.volunteer?.create) {
      return NextResponse.json(
        {
          error:
            "Volunteer sign-up is not available yet. Please run: npx prisma generate, then restart the dev server (stop and run npm run dev again).",
        },
        { status: 503 }
      )
    }

    const volunteer = (await client.volunteer.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        city: data.city.trim(),
        dateOfBirth: dateOfBirth,
        status: "ACTIVE",
      },
    })) as { id: string }

    return NextResponse.json({
      id: volunteer.id,
      message: "Thank you for signing up as a volunteer. We'll be in touch soon.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join("; ") },
        { status: 400 }
      )
    }
    console.error("Volunteer sign-up POST error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to submit sign-up"
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? message : "Failed to submit sign-up" },
      { status: 500 }
    )
  }
}
