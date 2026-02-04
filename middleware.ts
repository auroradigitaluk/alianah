import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_AUTH_PATHS = [
  "/admin/login",
  "/admin/login/otp",
  "/admin/login/set-password",
]

function isAdminAuthPath(pathname: string): boolean {
  return ADMIN_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isAdminPath(pathname)) {
    return NextResponse.next()
  }

  if (isAdminAuthPath(pathname)) {
    const session =
      request.cookies.get("__Host-admin_session")?.value ??
      request.cookies.get("admin_session")?.value
    if (session) {
      const redirect = request.nextUrl.searchParams.get("redirect") || "/admin/dashboard"
      return NextResponse.redirect(new URL(redirect, request.url))
    }
    return NextResponse.next()
  }

  const session =
    request.cookies.get("__Host-admin_session")?.value ??
    request.cookies.get("admin_session")?.value

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
