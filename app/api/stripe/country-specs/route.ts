import { NextResponse } from "next/server"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set")
    stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia" as unknown as Stripe.LatestApiVersion,
    })
  }
  return stripe
}

export async function GET() {
  const client = getStripe()
  const countries = new Set<string>()
  let startingAfter: string | undefined

  do {
    const page = await client.countrySpecs.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const spec of page.data) {
      if (spec?.id) countries.add(spec.id)
    }

    startingAfter = page.has_more ? page.data[page.data.length - 1]?.id : undefined
  } while (startingAfter)

  return NextResponse.json({ countries: Array.from(countries) })
}
