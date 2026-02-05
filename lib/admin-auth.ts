import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

const SALT_ROUNDS = 12
const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-admin_session" : "admin_session"
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-in-production")

export type AdminUserResult = {
  id: string
  email: string
  role: string
  twoFactorEnabled: boolean
}

const PASSWORD_MIN_LENGTH = 12
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (!PASSWORD_REGEX.test(password)) {
    return "Password must contain uppercase, lowercase, number, and special character"
  }
  return null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function signSession(payload: { email: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = createHmac("sha256", SESSION_SECRET).update(data).digest("base64url")
  return `${data}.${sig}`
}

function verifySession(token: string): { email: string; exp: number } | null {
  if (!SESSION_SECRET) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [data, sig] = parts
  const expected = createHmac("sha256", SESSION_SECRET).update(data).digest("base64url")
  try {
    if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
      return null
    }
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as {
      email: string
      exp: number
    }
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null
    if (payload.exp < Date.now()) return null // expired
    return payload
  } catch {
    return null
  }
}

export async function getAdminUser(): Promise<AdminUserResult | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionToken) return null

    const payload = verifySession(sessionToken)
    if (!payload) return null

    const user = await prisma.adminUser.findUnique({
      where: { email: payload.email.trim().toLowerCase() },
      select: { id: true, email: true, role: true, twoFactorEnabled: true },
    })

    if (!user) return null
    return user
  } catch (error) {
    console.error("getAdminUser error:", error)
    return null
  }
}

export async function requireAdminAuth(): Promise<AdminUserResult> {
  const user = await getAdminUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireAdminRole(allowedRoles: string[]): Promise<AdminUserResult> {
  const user = await requireAdminAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden")
  }
  return user
}

/** Use in API routes: returns [user, errorResponse]. If errorResponse is set, return it. */
export async function requireAdminAuthSafe(): Promise<
  [AdminUserResult, NextResponse] | [AdminUserResult, null]
> {
  try {
    const user = await requireAdminAuth()
    return [user, null]
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized"
    return [
      null as unknown as AdminUserResult,
      NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 }),
    ]
  }
}

/** Use in API routes: returns [user, errorResponse]. If errorResponse is set, return it. */
export async function requireAdminRoleSafe(
  allowedRoles: string[]
): Promise<[AdminUserResult, NextResponse] | [AdminUserResult, null]> {
  try {
    const user = await requireAdminRole(allowedRoles)
    return [user, null]
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized"
    return [
      null as unknown as AdminUserResult,
      NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 401 }),
    ]
  }
}

export async function setAdminSession(email: string): Promise<void> {
  const cookieStore = await cookies()
  const exp = Date.now() + SESSION_MAX_AGE * 1000
  const token = signSession({ email: email.trim().toLowerCase(), exp })

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  const expireOpts = { ...COOKIE_OPTS, maxAge: 0 }
  // Use set with maxAge: 0 instead of delete - more reliable for __Host- cookies in production
  cookieStore.set(SESSION_COOKIE, "", expireOpts)
  cookieStore.set("admin_session", "", expireOpts)
  cookieStore.set("__Host-admin_session", "", expireOpts)
}

export { canAccessRoute } from "./admin-routes"
