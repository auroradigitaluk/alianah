import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ADMIN_AUTH_PATHS = ["/login", "/login/otp", "/login/set-password"]

function isAdminAuthPath(pathname: string): boolean {
  return ADMIN_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session =
    request.cookies.get("__Host-admin_session")?.value ??
    request.cookies.get("admin_session")?.value

  // Login pages: redirect to dashboard if already logged in
  if (isAdminAuthPath(pathname)) {
    if (session) {
      const redirect = request.nextUrl.searchParams.get("redirect") || "/admin/dashboard"
      return NextResponse.redirect(new URL(redirect, request.url))
    }
    return NextResponse.next()
  }

  // Admin pages: redirect to login if not logged in
  if (isAdminPath(pathname)) {
    if (!session) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/login/otp", "/login/set-password"],
}
