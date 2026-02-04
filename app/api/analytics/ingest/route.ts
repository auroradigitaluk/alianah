import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseUserAgent } from "@/lib/parse-user-agent"

type DrainEvent = {
  schema?: string
  eventType?: string
  timestamp?: number
  projectId?: string
  sessionId?: number
  deviceId?: number
  path?: string
  referrer?: string
  country?: string
  region?: string
  city?: string
  deviceType?: string
  osName?: string
  clientName?: string
  vercelEnvironment?: string
}

type ClientEvent = {
  path: string
  referrer?: string
}

function hashToInt(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function parseDrainPayload(bodyText: string): DrainEvent[] {
  const trimmed = bodyText.trim()
  if (!trimmed) return []

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : []
  }

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed)
    return parsed ? [parsed] : []
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

export async function POST(request: Request) {
  const bodyText = await request.text()
  const contentType = request.headers.get("content-type") ?? ""

  // Client-side tracking: same-origin, JSON with path
  if (contentType.includes("application/json") && bodyText.trim().startsWith("{")) {
    let clientEvent: ClientEvent
    try {
      clientEvent = JSON.parse(bodyText) as ClientEvent
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
    if (!clientEvent?.path || typeof clientEvent.path !== "string") {
      return NextResponse.json({ error: "path required" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const SESSION_COOKIE = "va_sid"
    const VISITOR_COOKIE = "va_vid"
    const SESSION_AGE = 60 * 60 * 24 // 24h
    const VISITOR_AGE = 60 * 60 * 24 * 365 // 1 year

    let sessionId = cookieStore.get(SESSION_COOKIE)?.value
    let visitorId = cookieStore.get(VISITOR_COOKIE)?.value

    if (!sessionId) {
      sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2)}`
      cookieStore.set(SESSION_COOKIE, sessionId, {
        maxAge: SESSION_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2)}`
      cookieStore.set(VISITOR_COOKIE, visitorId, {
        maxAge: VISITOR_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }

    const userAgent = request.headers.get("user-agent")
    const { deviceType, osName, clientName } = parseUserAgent(userAgent)
    const country = request.headers.get("x-vercel-ip-country") ?? null

    const referrer = clientEvent.referrer || null
    const path = clientEvent.path.startsWith("/") ? clientEvent.path : `/${clientEvent.path}`

    await prisma.analyticsEvent.create({
      data: {
        eventType: "pageview",
        timestamp: new Date(),
        projectId: process.env.VERCEL_ANALYTICS_PROJECT_ID ?? null,
        sessionId: hashToInt(sessionId),
        deviceId: hashToInt(visitorId),
        path,
        referrer: referrer || null,
        country,
        region: null,
        city: null,
        deviceType,
        osName,
        clientName,
        vercelEnvironment: process.env.VERCEL ? "production" : null,
      },
    })

    return NextResponse.json({ ok: true })
  }

  // Vercel drain format
  const secret = process.env.ANALYTICS_DRAIN_SECRET
  if (secret) {
    const provided = request.headers.get("x-analytics-secret")
    if (!provided || provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID
  let events: DrainEvent[] = []
  try {
    events = parseDrainPayload(bodyText)
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const normalized = events
    .filter((event) => event?.schema === "vercel.analytics.v1")
    .filter((event) => event.eventType === "pageview")
    .filter((event) => (projectId ? event.projectId === projectId : true))
    .map((event) => {
      const timestampMs = typeof event.timestamp === "number" ? event.timestamp : Date.now()
      return {
        eventType: event.eventType || "pageview",
        timestamp: new Date(timestampMs),
        projectId: event.projectId || null,
        sessionId: event.sessionId ?? null,
        deviceId: event.deviceId ?? null,
        path: event.path || null,
        referrer: event.referrer || null,
        country: event.country || null,
        region: event.region || null,
        city: event.city || null,
        deviceType: event.deviceType || null,
        osName: event.osName || null,
        clientName: event.clientName || null,
        vercelEnvironment: event.vercelEnvironment || null,
      }
    })

  if (normalized.length === 0) {
    return NextResponse.json({ received: events.length, inserted: 0 })
  }

  await prisma.analyticsEvent.createMany({
    data: normalized,
  })

  return NextResponse.json({ received: events.length, inserted: normalized.length })
}
