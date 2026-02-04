/**
 * In-memory rate limiter for auth and sensitive endpoints.
 * Enterprise-grade: per-IP and per-email lockout.
 */

const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOGIN_MAX_ATTEMPTS = 5
const OTP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const OTP_MAX_ATTEMPTS = 5
const SET_PASSWORD_WINDOW_MS = 15 * 60 * 1000
const SET_PASSWORD_MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 min lockout after max attempts

const attempts = new Map<string, { count: number; resetAt: number; lockedUntil?: number }>()

function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxAttempts: number,
  lockoutMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = attempts.get(identifier)

  if (!record) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  // Check if locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) }
  }

  if (now > record.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxAttempts) {
    const lockedUntil = now + lockoutMs
    attempts.set(identifier, { ...record, lockedUntil })
    return { allowed: false, retryAfter: Math.ceil(lockoutMs / 1000) }
  }

  record.count++
  return { allowed: true }
}

export function checkLoginRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  return checkRateLimit(identifier, LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS, LOCKOUT_DURATION_MS)
}

export function checkOtpRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  return checkRateLimit(identifier, OTP_WINDOW_MS, OTP_MAX_ATTEMPTS, LOCKOUT_DURATION_MS)
}

export function checkSetPasswordRateLimit(
  identifier: string
): { allowed: boolean; retryAfter?: number } {
  return checkRateLimit(
    identifier,
    SET_PASSWORD_WINDOW_MS,
    SET_PASSWORD_MAX_ATTEMPTS,
    LOCKOUT_DURATION_MS
  )
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown"
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}
