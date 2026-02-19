import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getDailyGivingSettings } from "@/lib/settings"
import { getStripe } from "@/lib/stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Vercel sends CRON_SECRET as Bearer token when invoking crons. Query ?token= also allowed for manual/external triggers. */
function authorize(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) return true
  const url = new URL(request.url)
  if (url.searchParams.get("token") === secret) return true
  return false
}

/** Today's date as YYYY-MM-DD in Europe/London (used so 8pm UK = correct calendar day when cron runs at 20:00 UTC). */
function getTodayUK(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" })
}

/**
 * Calendar dates (YYYY-MM-DD) when we charge for the odd nights.
 * Odd nights = 21st, 23rd, 25th, 27th, 29th night of Ramadan.
 * We charge at 8pm UK on Ramadan days 20, 22, 24, 26, 28 (start of each odd night).
 * Eid = first day of Shawwal; last day of Ramadan = eidDate - 1. So Ramadan day N = eidDate - (31 - N).
 * Charge dates: eidDate - 11, -9, -7, -5, -3.
 */
function getOddNightChargeDates(eidDate: Date): string[] {
  const dates: string[] = []
  const eid = new Date(eidDate)
  eid.setUTCHours(0, 0, 0, 0)
  for (const offset of [11, 9, 7, 5, 3]) {
    const d = new Date(eid)
    d.setUTCDate(d.getUTCDate() - offset)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const settings = await getDailyGivingSettings()
  if (!settings.ramadhanEndDate) {
    return NextResponse.json({ ok: true, charged: 0, reason: "No Ramadhan end date" })
  }

  const todayStr = getTodayUK()
  const chargeDates = getOddNightChargeDates(settings.ramadhanEndDate)
  if (!chargeDates.includes(todayStr)) {
    return NextResponse.json({
      ok: true,
      charged: 0,
      reason: "Not an odd-night charge date",
      todayUK: todayStr,
      oddNightChargeDates: chargeDates,
    })
  }

  const todayStart = new Date(`${todayStr}T00:00:00.000Z`)
  const stripe = getStripe()

  const recurring = await prisma.recurringDonation.findMany({
    where: {
      frequency: "DAILY",
      dailyGivingOddNightsOnly: true,
      status: "ACTIVE",
      stripeCustomerId: { not: null },
      scheduleEndDate: { gte: todayStart },
    },
    include: { donor: true, appeal: true },
  })

  let charged = 0
  let errors = 0

  for (const r of recurring) {
    if (!r.stripeCustomerId) continue
    const idempotencyKey = `odd-night-${r.id}-${todayStr}`
    try {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: r.amountPence,
          currency: "gbp",
          customer: r.stripeCustomerId,
          off_session: true,
          confirm: true,
          automatic_payment_methods: { enabled: true },
          metadata: {
            recurringDonationId: r.id,
            type: "daily_odd_night",
          },
          description: `Daily giving (odd night) – ${r.appeal?.title ?? "Appeal"}`,
        },
        { idempotencyKey }
      )
      if (paymentIntent.status === "succeeded" || paymentIntent.status === "processing") {
        charged++
      }
    } catch (err) {
      console.error(`Odd night charge failed for recurring ${r.id}:`, err)
      errors++
    }
  }

  return NextResponse.json({
    ok: true,
    charged,
    errors,
    date: todayStr,
    message: `Charged on odd-night date (21st/23rd/25th/27th/29th night of Ramadan).`,
  })
}
