import crypto from "crypto"

export type CollectionReceiptPayload = {
  locationName: string
  collectionType: string
  collectedAt: string // ISO date
  totalPence: number
  sadaqahPence: number
  zakatPence: number
  lillahPence: number
  cardPence: number
  exp: number
}

const TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

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

function getSecret(): string {
  const secret = process.env.COLLECTION_RECEIPT_SECRET
  if (!secret) {
    throw new Error("COLLECTION_RECEIPT_SECRET is not set")
  }
  return secret
}

export function createCollectionReceiptToken(payload: Omit<CollectionReceiptPayload, "exp">): string {
  const full: CollectionReceiptPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  }
  const payloadJson = JSON.stringify(full)
  const payloadB64 = base64UrlEncode(payloadJson)
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest()
  const sigB64 = base64UrlEncode(sig)
  return `${payloadB64}.${sigB64}`
}

export function verifyCollectionReceiptToken(token: string): CollectionReceiptPayload | null {
  try {
    const secret = process.env.COLLECTION_RECEIPT_SECRET
    if (!secret) return null

    const [payloadB64, sigB64] = token.split(".")
    if (!payloadB64 || !sigB64) return null

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest()
    const expectedSigB64 = base64UrlEncode(expectedSig)

    const a = Buffer.from(sigB64)
    const b = Buffer.from(expectedSigB64)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null

    const payloadJson = base64UrlDecodeToString(payloadB64)
    const payload = JSON.parse(payloadJson) as CollectionReceiptPayload

    if (!payload?.locationName || typeof payload.collectedAt !== "string" || !payload?.collectionType) return null
    if (typeof payload.totalPence !== "number") return null
    if (typeof payload.exp !== "number" || Math.floor(Date.now() / 1000) > payload.exp) return null

    return payload
  } catch {
    return null
  }
}
