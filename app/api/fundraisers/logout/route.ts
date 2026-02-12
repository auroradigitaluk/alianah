import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    cookieStore.set("fundraiser_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 })
  }
}
