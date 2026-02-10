"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { OneNationDonationForm } from "@/components/one-nation-donation-form"
import type { ZakatPricesResponse } from "@/app/api/zakat/prices/route"

export type ZakatAppeal = {
  id: string
  title: string
  slug: string
  allowMonthly: boolean
  monthlyPricePence: number | null
  oneOffPresetAmountsPence?: string
  monthlyPresetAmountsPence?: string
}

function formatGbp(amount: number): string {
  return `£${amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseNum(value: string): number {
  const n = parseFloat(String(value).replace(/[£,\s]/g, ""))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function AmountInput({
  id,
  value,
  onChange,
  placeholder = "0",
  ...props
}: React.ComponentProps<typeof Input> & { id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="flex h-9 items-center rounded-md border border-input bg-transparent shadow-xs">
      <span className="pl-3 text-muted-foreground text-sm">£</span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none rounded-r-md h-9 flex-1 min-w-0"
        {...props}
      />
    </div>
  )
}

// Nisab weights (grams) - match API
const NISAB_GOLD_GRAMS = 87.48
const NISAB_SILVER_GRAMS = 612.36
const ZAKAT_RATE = 0.025 // 2.5%

interface ZakatCalculatorProps {
  appeals?: ZakatAppeal[]
}

export function ZakatCalculator({ appeals = [] }: ZakatCalculatorProps) {
  const [prices, setPrices] = React.useState<ZakatPricesResponse | null>(null)
  const [pricesError, setPricesError] = React.useState<string | null>(null)
  const [showDonationForm, setShowDonationForm] = React.useState(false)
  const donationFormRef = React.useRef<HTMLDivElement>(null)

  // Zakatable assets (all in GBP)
  const [cashInHand, setCashInHand] = React.useState("")
  const [savingsDeposits, setSavingsDeposits] = React.useState("")
  const [loansGiven, setLoansGiven] = React.useState("")
  const [investmentsShares, setInvestmentsShares] = React.useState("")
  const [tradeGoods, setTradeGoods] = React.useState("")
  const [goldValue, setGoldValue] = React.useState("")
  const [silverValue, setSilverValue] = React.useState("")

  // Deductible liabilities (GBP)
  const [borrowedMoney, setBorrowedMoney] = React.useState("")
  const [wagesDue, setWagesDue] = React.useState("")
  const [taxesRentBills, setTaxesRentBills] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    setPricesError(null)
    fetch("/api/zakat/prices")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load prices")
        return res.json()
      })
      .then((data: ZakatPricesResponse) => {
        if (!cancelled) setPrices(data)
      })
      .catch((err) => {
        if (!cancelled) setPricesError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totalAssets =
    parseNum(cashInHand) +
    parseNum(savingsDeposits) +
    parseNum(loansGiven) +
    parseNum(investmentsShares) +
    parseNum(tradeGoods) +
    parseNum(goldValue) +
    parseNum(silverValue)

  const totalLiabilities = parseNum(borrowedMoney) + parseNum(wagesDue) + parseNum(taxesRentBills)
  const netWealth = totalAssets - totalLiabilities

  const nisabThreshold = prices ? prices.nisabSilverGBP : 0

  const aboveNisab = netWealth >= nisabThreshold && nisabThreshold > 0
  // Zakat = 2.5% of net wealth (assets − liabilities) when above nisab (Islamic Relief method)
  const zakatDue = aboveNisab ? netWealth * ZAKAT_RATE : 0
  const zakatDuePence = Math.round(zakatDue * 100)

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Zakat Calculator</h1>
        <p className="mt-2 text-muted-foreground">
          Enter all assets that have been in your possession over a lunar (Hijri) year. The
          calculator uses the live silver nisab to give you the total amount of Zakat owed.
        </p>
      </div>

      {/* Today's Nisab value */}
      <Card className="mb-6 pt-4">
        <CardContent className="pt-3">
          <p className="text-sm font-medium text-muted-foreground mb-1">Today&apos;s Nisab value</p>
          {!prices ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <p className="text-2xl font-semibold">{formatGbp(prices.nisabSilverGBP)}</p>
          )}
          {prices && (
            <p className="text-xs text-muted-foreground mt-1">
              Based on 612.36g silver. Updated {new Date(prices.updatedAt).toLocaleString("en-GB")}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Zakatable assets */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Zakatable assets</CardTitle>
          <CardDescription>
            Total value of assets held for one lunar year (cash, savings, gold, silver, investments,
            etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="cash">Cash (in hand and bank accounts)</Label>
            <AmountInput
              id="cash"
              value={cashInHand}
              onChange={(e) => setCashInHand(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="savings">Savings and deposits</Label>
            <AmountInput
              id="savings"
              value={savingsDeposits}
              onChange={(e) => setSavingsDeposits(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="loans-given">Loans given to others (you expect back)</Label>
            <AmountInput
              id="loans-given"
              value={loansGiven}
              onChange={(e) => setLoansGiven(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="investments">Business investments, shares, saving certificates</Label>
            <AmountInput
              id="investments"
              value={investmentsShares}
              onChange={(e) => setInvestmentsShares(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trade-goods">Trade goods (stock for sale)</Label>
            <AmountInput
              id="trade-goods"
              value={tradeGoods}
              onChange={(e) => setTradeGoods(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gold">Gold (value in GBP)</Label>
            <AmountInput
              id="gold"
              value={goldValue}
              onChange={(e) => setGoldValue(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="silver">Silver (value in GBP)</Label>
            <AmountInput
              id="silver"
              value={silverValue}
              onChange={(e) => setSilverValue(e.target.value)}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Total zakatable assets: {formatGbp(totalAssets)}
          </p>
        </CardContent>
      </Card>

      {/* Deductible liabilities */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Deductible liabilities</CardTitle>
          <CardDescription>
            Deduct: debts due within 12 months, up to 12 months of longer-term instalments, arrears
            and overdue payments, and taxes/rent/bills due now. Interest (riba) is not deductible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="borrowed">Borrowed money and credit purchases</Label>
            <AmountInput
              id="borrowed"
              value={borrowedMoney}
              onChange={(e) => setBorrowedMoney(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wages">Wages due to employees</Label>
            <AmountInput
              id="wages"
              value={wagesDue}
              onChange={(e) => setWagesDue(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bills">Taxes, rent, utility bills due immediately</Label>
            <AmountInput
              id="bills"
              value={taxesRentBills}
              onChange={(e) => setTaxesRentBills(e.target.value)}
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Total liabilities: {formatGbp(totalLiabilities)}
          </p>
        </CardContent>
      </Card>

      {/* Result */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Zakat</CardTitle>
          <CardDescription>
            Net wealth = assets − liabilities. If net wealth ≥ nisab, Zakat is 2.5% of your net
            wealth (Net wealth × 2.5% = Zakat owed for the year).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Net wealth</span>
            <span>{formatGbp(netWealth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nisab threshold (silver)</span>
            <span>{prices ? formatGbp(nisabThreshold) : "—"}</span>
          </div>
          <Separator />
          {aboveNisab ? (
            <>
              <div className="flex justify-between font-semibold text-lg">
                <span>Zakat due (2.5% of net wealth)</span>
                <span>{formatGbp(zakatDue)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={zakatDuePence <= 0 || appeals.length === 0}
                onClick={() => {
                  setShowDonationForm(true)
                  setTimeout(() => donationFormRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
                }}
              >
                Donate Zakat
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Your net wealth is below the nisab threshold. You are not required to pay Zakat this
              year. You may still give voluntarily (Sadaqah).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Donation form (Zakat only) - shown on same page when user clicks Donate Zakat */}
      {showDonationForm && appeals.length > 0 && (
        <div ref={donationFormRef} className="mt-10 scroll-mt-8">
          <h2 className="text-xl font-semibold mb-4">Donate your Zakat</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your amount is pre-filled below. Choose a project and add to basket to proceed to checkout.
          </p>
          <OneNationDonationForm
            key={zakatDuePence}
            appeals={appeals}
            products={[]}
            donationTypesEnabled={["ZAKAT"]}
            waterProjects={[]}
            waterProjectCountries={[]}
            sponsorshipProjects={[]}
            sponsorshipProjectCountries={[]}
            initialZakatPence={zakatDuePence > 0 ? zakatDuePence : undefined}
            hideDonationTypeToggle
            zakatFixedAmountPence={zakatDuePence > 0 ? zakatDuePence : undefined}
          />
        </div>
      )}

      {/* Note on Zakatable assets */}
      <p className="text-xs text-muted-foreground max-w-2xl">
        Zakat is based on zakatable wealth (not just income or savings). Include gold, silver, cash,
        savings and business assets held over a lunar year. You also pay Zakat on money owed to you
        that you expect to be repaid. For UK tax: tax that is due or overdue may be deducted; money
        set aside for a due tax bill may also be deducted.
      </p>
    </div>
  )
}
