import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRoleSafe } from "@/lib/admin-auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    let user: { id: string; email: string; firstName: string | null; lastName: string | null; role: string; createdAt: Date; passwordHash: string | null; lastLoginAt?: Date | null } | null
    try {
      user = await prisma.adminUser.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
          passwordHash: true,
        },
      })
    } catch {
      user = await prisma.adminUser.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          passwordHash: true,
        },
      })
    }
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const { passwordHash, ...rest } = user
    return NextResponse.json({
      ...rest,
      hasSetPassword: !!passwordHash,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: "lastLoginAt" in user && user.lastLoginAt != null ? user.lastLoginAt.toISOString() : null,
    })
  } catch (error) {
    console.error("Admin user GET error:", error)
    return NextResponse.json(
      { error: "Failed to load user" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params
    const body = await request.json()
    const { role, firstName, lastName } = body

    const data: { role?: string; firstName?: string | null; lastName?: string | null } = {}
    if (role !== undefined) {
      const validRoles = ["ADMIN", "STAFF", "VIEWER"]
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: "Invalid role" },
          { status: 400 }
        )
      }
      data.role = role
    }
    if (firstName !== undefined) data.firstName = firstName === "" ? null : String(firstName)
    if (lastName !== undefined) data.lastName = lastName === "" ? null : String(lastName)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data,
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Admin user PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update admin user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requireAdminRoleSafe(["ADMIN"])
  if (err) return err
  try {
    const { id } = await params

    await prisma.adminUser.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin user DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to remove admin user" },
      { status: 500 }
    )
  }
}
