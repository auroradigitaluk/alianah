import crypto from "crypto"

type PortalTokenPayload = {
  email: string
  exp: number // unix seconds
}

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function base64UrlDecodeToString(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4)
  return Buffer.from(padded, "base64").toString("utf8")
}

function getPortalSecret(): string {
  const secret = process.env.PORTAL_LINK_SECRET
  if (!secret) {
    throw new Error("PORTAL_LINK_SECRET is not set")
  }
  return secret
}

export function createPortalToken(email: string, ttlSeconds = 60 * 60): string {
  const payload: PortalTokenPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }

  const payloadJson = JSON.stringify(payload)
  const payloadB64 = base64UrlEncode(payloadJson)
  const sig = crypto
    .createHmac("sha256", getPortalSecret())
    .update(payloadB64)
    .digest()
  const sigB64 = base64UrlEncode(sig)

  return `${payloadB64}.${sigB64}`
}

export function verifyPortalToken(token: string): { email: string } | null {
  try {
    const [payloadB64, sigB64] = token.split(".")
    if (!payloadB64 || !sigB64) return null

    const expectedSig = crypto
      .createHmac("sha256", getPortalSecret())
      .update(payloadB64)
      .digest()
    const expectedSigB64 = base64UrlEncode(expectedSig)

    // Constant-time compare
    const a = Buffer.from(sigB64)
    const b = Buffer.from(expectedSigB64)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null

    const payloadJson = base64UrlDecodeToString(payloadB64)
    const payload = JSON.parse(payloadJson) as PortalTokenPayload

    if (!payload?.email || typeof payload.email !== "string") return null
    if (!payload?.exp || typeof payload.exp !== "number") return null
    if (Math.floor(Date.now() / 1000) > payload.exp) return null

    return { email: payload.email }
  } catch {
    return null
  }
}

