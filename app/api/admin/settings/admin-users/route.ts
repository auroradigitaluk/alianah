import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/admin-auth"
import { sendAdminInviteEmail } from "@/lib/email"
import { nanoid } from "nanoid"

export async function GET() {
  try {
    await requireAdminRole(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
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
    await requireAdminRole(["ADMIN"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { email, role } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const validRoles = ["ADMIN", "STAFF", "VIEWER"]
    const userRole = validRoles.includes(role) ? role : "STAFF"

    const existing = await prisma.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    if (existing) {
      return NextResponse.json(
        { error: "An admin with this email already exists" },
        { status: 409 }
      )
    }

    const inviteToken = nanoid(32)
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const user = await prisma.adminUser.create({
      data: {
        email: email.trim().toLowerCase(),
        role: userRole,
        inviteToken,
        inviteExpiresAt,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const setPasswordUrl = `${baseUrl}/admin/login/set-password?token=${inviteToken}`

    try {
      await sendAdminInviteEmail({
        email: user.email,
        setPasswordUrl,
      })
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError)
      await prisma.adminUser.delete({ where: { id: user.id } })
      return NextResponse.json(
        { error: "Failed to send invite email. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...user,
      inviteSent: true,
    })
  } catch (error) {
    console.error("Admin users POST error:", error)
    return NextResponse.json(
      { error: "Failed to add admin user" },
      { status: 500 }
    )
  }
}
