import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const users = await prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error("Admin users GET error:", error)
    return NextResponse.json(
      { error: "Failed to load admin users" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, role } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const validRoles = ["ADMIN", "MANAGER", "VIEWER"]
    const userRole = validRoles.includes(role) ? role : "VIEWER"

    const existing = await prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: "An admin with this email already exists" },
        { status: 409 }
      )
    }

    const user = await prisma.adminUser.create({
      data: {
        email: email.trim().toLowerCase(),
        role: userRole,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Admin users POST error:", error)
    return NextResponse.json(
      { error: "Failed to add admin user" },
      { status: 500 }
    )
  }
}
