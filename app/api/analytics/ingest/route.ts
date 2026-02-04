import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
  const secret = process.env.ANALYTICS_DRAIN_SECRET
  if (secret) {
    const provided = request.headers.get("x-analytics-secret")
    if (!provided || provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID
  const bodyText = await request.text()

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
