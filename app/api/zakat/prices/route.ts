import { NextResponse } from "next/server"

// Nisab weights in grams (Islamic Relief values)
export const NISAB_GOLD_GRAMS = 87.48
export const NISAB_SILVER_GRAMS = 612.36

// Troy oz to grams
const TROY_OZ_TO_GRAMS = 31.1035

// Fallback prices per gram in GBP (approximate; used when no API key)
const FALLBACK_GOLD_GBP_PER_GRAM = 65
const FALLBACK_SILVER_GBP_PER_GRAM = 0.78

export type ZakatPricesResponse = {
  goldPerGramGBP: number
  silverPerGramGBP: number
  nisabGoldGBP: number
  nisabSilverGBP: number
  updatedAt: string
  source: "api" | "fallback"
}

export async function GET() {
  const apiKey = process.env.GOLDAPI_API_KEY

  if (apiKey) {
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetch("https://www.goldapi.io/api/XAU/GBP", {
          headers: { "x-access-token": apiKey },
          next: { revalidate: 3600 },
        }),
        fetch("https://www.goldapi.io/api/XAG/GBP", {
          headers: { "x-access-token": apiKey },
          next: { revalidate: 3600 },
        }),
      ])

      if (!goldRes.ok || !silverRes.ok) {
        throw new Error("GoldAPI request failed")
      }

      const gold = await goldRes.json()
      const silver = await silverRes.json()

      // GoldAPI returns price per troy oz in GBP
      const goldPerGramGBP = gold.price / TROY_OZ_TO_GRAMS
      const silverPerGramGBP = silver.price / TROY_OZ_TO_GRAMS

      const nisabGoldGBP = Math.round(goldPerGramGBP * NISAB_GOLD_GRAMS * 100) / 100
      const nisabSilverGBP = Math.round(silverPerGramGBP * NISAB_SILVER_GRAMS * 100) / 100

      return NextResponse.json({
        goldPerGramGBP: Math.round(goldPerGramGBP * 10000) / 10000,
        silverPerGramGBP: Math.round(silverPerGramGBP * 10000) / 10000,
        nisabGoldGBP,
        nisabSilverGBP,
        updatedAt: new Date().toISOString(),
        source: "api",
      } satisfies ZakatPricesResponse)
    } catch (e) {
      console.error("Zakat prices API error:", e)
      // Fall through to fallback
    }
  }

  // Fallback when no API key or API failed
  const goldPerGramGBP = FALLBACK_GOLD_GBP_PER_GRAM
  const silverPerGramGBP = FALLBACK_SILVER_GBP_PER_GRAM
  const nisabGoldGBP = Math.round(goldPerGramGBP * NISAB_GOLD_GRAMS * 100) / 100
  const nisabSilverGBP = Math.round(silverPerGramGBP * NISAB_SILVER_GRAMS * 100) / 100

  return NextResponse.json({
    goldPerGramGBP,
    silverPerGramGBP,
    nisabGoldGBP,
    nisabSilverGBP,
    updatedAt: new Date().toISOString(),
    source: "fallback",
  } satisfies ZakatPricesResponse)
}
