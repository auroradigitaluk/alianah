import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { role } = body

    const validRoles = ["ADMIN", "MANAGER", "VIEWER"]
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    const user = await prisma.adminUser.update({
      where: { id },
      data: { role },
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
