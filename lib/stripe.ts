import Stripe from "stripe"

let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set")
    stripe = new Stripe(apiKey, {
      apiVersion: "2024-12-18.acacia" as unknown as Stripe.LatestApiVersion,
    })
  }
  return stripe
}
