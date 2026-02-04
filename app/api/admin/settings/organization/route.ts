import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const SETTINGS_ID = "organization"

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: SETTINGS_ID,
          charityName: "Alianah Humanity Welfare",
          supportEmail: "support@alianah.org",
          websiteUrl: "https://www.alianah.org",
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Settings GET error:", error)
    return NextResponse.json(
      { error: "Failed to load organization settings" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const charityName =
      typeof body.charityName === "string" ? body.charityName.trim() : undefined
    const supportEmail =
      typeof body.supportEmail === "string" ? body.supportEmail.trim() : undefined
    const websiteUrl =
      typeof body.websiteUrl === "string" ? body.websiteUrl.trim() : undefined
    const charityNumber =
      body.charityNumber === null || body.charityNumber === ""
        ? null
        : typeof body.charityNumber === "string"
          ? body.charityNumber.trim() || null
          : undefined

    if (!charityName || !supportEmail || !websiteUrl) {
      return NextResponse.json(
        { error: "Charity name, support email, and website URL are required" },
        { status: 400 }
      )
    }

    const updateData: Record<string, string | null> = {
      charityName,
      supportEmail,
      websiteUrl,
      charityNumber: charityNumber ?? null,
    }

    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: updateData,
      create: {
        id: SETTINGS_ID,
        charityName,
        supportEmail,
        websiteUrl,
        charityNumber: charityNumber ?? null,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Settings PATCH error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to update organization settings"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
