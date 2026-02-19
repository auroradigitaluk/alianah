"use client"

import * as React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatEnum } from "@/lib/utils"
import { ArrowRight, ChevronLeft, Moon, Minus, Plus } from "lucide-react"
import { DailyGivingPaymentStep } from "@/components/daily-giving-payment-step"

/** Default end of Ramadhan if admin has not set one (20 March). */
const DEFAULT_END_MONTH = 2 // March
const DEFAULT_END_DAY = 20

/** Last 10 nights = 10 days ending the day before end of Ramadhan. */
const LAST_10_NIGHTS_COUNT = 10
const LAST_10_ODD_NIGHTS_COUNT = 5

const AMOUNT_STEP = 1
const MIN_AMOUNT = 1
const MAX_AMOUNT = 1000

type DonationType = "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"

interface AppealOption {
  id: string
  title: string
  slug: string
  summary: string | null
  donationTypesEnabled: string
  oneOffPresetAmountsPence: string | null
}

interface RamadhanDailyGivingFormProps {
  appeals: AppealOption[]
  /** End of Ramadhan from admin (ISO string). Final charge on this day, then subscription stops. */
  ramadhanEndDate: string | null
  /** Ramadhan start from admin (ISO string, optional). */
  ramadhanStartDate: string | null
}

function getDefaultEndDate(): Date {
  const now = new Date()
  const endThisYear = new Date(now.getFullYear(), DEFAULT_END_MONTH, DEFAULT_END_DAY)
  return now > endThisYear
    ? new Date(now.getFullYear() + 1, DEFAULT_END_MONTH, DEFAULT_END_DAY)
    : endThisYear
}

function getLast10NightsDates(endDate: Date): Date[] {
  const dates: Date[] = []
  for (let i = LAST_10_NIGHTS_COUNT - 1; i >= 0; i--) {
    const d = new Date(endDate)
    d.setDate(d.getDate() - 1 - i)
    dates.push(d)
  }
  dates.sort((a, b) => a.getTime() - b.getTime())
  return dates
}

function formatEndDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export function RamadhanDailyGivingForm({ appeals, ramadhanEndDate: ramadhanEndDateProp, ramadhanStartDate: _ramadhanStartDate }: RamadhanDailyGivingFormProps) {
  /** End of Ramadhan: final charge on this day, then subscription stops. */
  const endDateForCount = React.useMemo(() => {
    if (!ramadhanEndDateProp) return getDefaultEndDate()
    const d = new Date(ramadhanEndDateProp)
    return isNaN(d.getTime()) ? getDefaultEndDate() : d
  }, [ramadhanEndDateProp])
  const endDateDisplayText = React.useMemo(
    () => formatEndDate(endDateForCount),
    [endDateForCount]
  )
  const last10NightsDates = React.useMemo(() => getLast10NightsDates(endDateForCount), [endDateForCount])

  const [step, setStep] = React.useState(0)
  const [selectedAppealId, setSelectedAppealId] = React.useState<string>("")
  const [donationType, setDonationType] = React.useState<DonationType>("GENERAL")
  const [mode, setMode] = React.useState<"daily" | "last10">("daily")
  const [last10Option, setLast10Option] = React.useState<"every" | "odd">("every")
  const [amountPounds, setAmountPounds] = React.useState(3)
  const [amountInputValue, setAmountInputValue] = React.useState("3")
  const [countAsZakat, setCountAsZakat] = React.useState(false)
  const selectedAppeal = appeals.find((a) => a.id === selectedAppealId)
  const donationTypesEnabled: DonationType[] = selectedAppeal?.donationTypesEnabled
    ? (() => {
        try {
          const arr = JSON.parse(selectedAppeal.donationTypesEnabled)
          return Array.isArray(arr) ? arr.filter((t) => ["GENERAL", "SADAQAH", "ZAKAT", "LILLAH"].includes(t)) : ["GENERAL"]
        } catch {
          return ["GENERAL"]
        }
      })()
    : ["GENERAL"]

  const isDonationType = (value: string): value is DonationType =>
    value === "GENERAL" || value === "SADAQAH" || value === "ZAKAT" || value === "LILLAH"

  React.useEffect(() => {
    if (donationTypesEnabled.length > 0 && !donationTypesEnabled.includes(donationType)) {
      setDonationType(donationTypesEnabled[0])
    }
  }, [selectedAppealId, donationTypesEnabled])

  const { dayCount, amountPerDayPence, totalPence, error: calcError } = React.useMemo(() => {
    if (isNaN(amountPounds) || amountPounds <= 0) {
      return { dayCount: 0, amountPerDayPence: 0, totalPence: 0, error: "Enter a valid amount" }
    }
    const amountPence = Math.round(amountPounds * 100)
    if (amountPence <= 0) return { dayCount: 0, amountPerDayPence: 0, totalPence: 0, error: "Amount must be positive" }

    if (mode === "last10") {
      const count = last10Option === "odd" ? LAST_10_ODD_NIGHTS_COUNT : LAST_10_NIGHTS_COUNT
      return { dayCount: count, amountPerDayPence: amountPence, totalPence: amountPence * count, error: null }
    }
    // Daily during Ramadhan: days left from today until Eid (inclusive), using UTC calendar dates
    const now = new Date()
    const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const eid = new Date(endDateForCount)
    const eidUTC = Date.UTC(eid.getUTCFullYear(), eid.getUTCMonth(), eid.getUTCDate())
    if (eidUTC < todayUTC) return { dayCount: 0, amountPerDayPence: 0, totalPence: 0, error: "End of Ramadhan has already passed" }
    const diffMs = eidUTC - todayUTC
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1
    return { dayCount: days, amountPerDayPence: amountPence, totalPence: amountPence * days, error: null }
  }, [mode, last10Option, amountPounds, endDateForCount])

  const effectiveDonationType = countAsZakat && donationTypesEnabled.includes("ZAKAT") ? "ZAKAT" : "SADAQAH"

  /** End date for Stripe daily subscription: last day we charge (inclusive). */
  const dailySubscriptionEndDate = React.useMemo(() => {
    if (mode === "daily") {
      const end = new Date(endDateForCount)
      end.setHours(0, 0, 0, 0)
      return end.toISOString().slice(0, 10)
    }
    if (mode === "last10" && last10Option === "every") {
      const lastNight = new Date(endDateForCount)
      lastNight.setDate(lastNight.getDate() - 1)
      return lastNight.toISOString().slice(0, 10)
    }
    return null
  }, [mode, last10Option, endDateForCount])

  /** Build checkout items for payment step (no basket). */
  const checkoutItems = React.useMemo(() => {
    if (!selectedAppeal || calcError || dayCount < 1 || amountPerDayPence <= 0) return []
    if (dailySubscriptionEndDate) {
      return [
        {
          appealId: selectedAppeal.id,
          appealTitle: selectedAppeal.title,
          frequency: "DAILY" as const,
          donationType: effectiveDonationType,
          amountPence: amountPerDayPence,
          dailyGivingEndDate: dailySubscriptionEndDate,
        },
      ]
    }
    return Array.from({ length: dayCount }, () => ({
      appealId: selectedAppeal.id,
      appealTitle: selectedAppeal.title,
      frequency: "ONE_OFF" as const,
      donationType: effectiveDonationType,
      amountPence: amountPerDayPence,
    }))
  }, [selectedAppeal, dailySubscriptionEndDate, dayCount, amountPerDayPence, effectiveDonationType, calcError])

  const checkoutSubtotalPence = dailySubscriptionEndDate ? amountPerDayPence : totalPence
  const checkoutFeesPence = 0
  const checkoutTotalPence = checkoutSubtotalPence + checkoutFeesPence

  const showZakatCard = donationTypesEnabled.includes("ZAKAT")

  // ——— Step 0: Intro ———
  if (step === 0) {
    return (
      <div className="flex flex-col justify-center items-center text-center w-full max-w-md mx-auto px-4 py-12">
        <Image
          src="/logo-dark.png"
          alt="Alianah"
          width={240}
          height={96}
          className="h-[4.8rem] sm:h-24 w-auto object-contain mb-8"
          priority
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mx-auto mb-6">
          <Moon className="size-4" />
          Daily Giving
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Daily Giving
        </h1>
        <p className="text-lg sm:text-xl text-foreground/90 mb-2">
          Start every day with sadaqah.
        </p>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-10">
          Never miss a day, and watch small deeds grow into lasting impact.
        </p>
        <Button
          size="lg"
          className="rounded-full px-8 text-base font-semibold h-12 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setStep(1)}
        >
          Bismillah! →
        </Button>
        <p className="text-xs text-muted-foreground mt-8 pt-4">
          Cancel your daily giving anytime - no commitment.
        </p>
      </div>
    )
  }

  // ——— Step 1: Choose amount ———
  if (step === 1) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        </div>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div className="h-full w-1/4 rounded-full bg-primary transition-all" aria-hidden />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Moon className="size-4" />
            Daily Giving
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-8">
            Choose your daily sadaqah
          </h2>
          <div className="flex items-center gap-4 sm:gap-6 mb-6">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 sm:size-14 rounded-full border-2 border-primary/30 hover:bg-primary/10 hover:border-primary shrink-0"
              onClick={() => {
                const next = Math.max(MIN_AMOUNT, amountPounds - AMOUNT_STEP)
                setAmountPounds(next)
                setAmountInputValue(String(next))
              }}
            >
              <Minus className="size-6" />
            </Button>
            <div className="flex-1 flex items-center justify-center min-w-0">
              <label className="flex items-baseline justify-center cursor-text gap-0">
                <span className="text-2xl sm:text-3xl font-bold text-foreground shrink-0 leading-none">£</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amountInputValue}
                  style={{
                    width: `${Math.max(2, amountInputValue.length + 1)}ch`,
                    marginLeft: "-0.1em",
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "")
                    setAmountInputValue(raw)
                    const v = raw === "" ? 0 : parseInt(raw, 10)
                    if (!Number.isNaN(v)) {
                      setAmountPounds(Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, v)))
                    }
                  }}
                  onBlur={() => {
                    const v = amountInputValue === "" ? MIN_AMOUNT : parseInt(amountInputValue, 10)
                    const clamped = Number.isNaN(v) || v < MIN_AMOUNT
                      ? MIN_AMOUNT
                      : Math.min(MAX_AMOUNT, v)
                    setAmountPounds(clamped)
                    setAmountInputValue(String(clamped))
                  }}
                  className="min-w-[2ch] bg-transparent border-none outline-none text-4xl sm:text-5xl font-bold text-foreground p-0 text-center focus:ring-0 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Amount in pounds"
                />
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 sm:size-14 rounded-full border-2 border-primary/30 hover:bg-primary/10 hover:border-primary shrink-0"
              onClick={() => {
                const next = Math.min(MAX_AMOUNT, amountPounds + AMOUNT_STEP)
                setAmountPounds(next)
                setAmountInputValue(String(next))
              }}
            >
              <Plus className="size-6" />
            </Button>
          </div>
          <p className="text-center text-muted-foreground text-sm mb-2">
            You’ll donate this amount each day during your chosen period.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full rounded-full h-12 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setStep(2)}
        >
          Continue →
        </Button>
      </div>
    )
  }

  // ——— Step 3: Payment (donor details + card) ———
  if (step === 3) {
    return (
      <DailyGivingPaymentStep
        items={checkoutItems}
        subtotalPence={checkoutSubtotalPence}
        feesPence={checkoutFeesPence}
        totalPence={checkoutTotalPence}
        totalDonationOverPeriodPence={totalPence}
        onSuccess={() => {}}
        onBack={() => setStep(2)}
      />
    )
  }

  // ——— Step 2: Where to give ———
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
      </div>
      <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
        <div className="h-full w-1/2 rounded-full bg-primary transition-all" aria-hidden />
      </div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
          <Moon className="size-4" />
          Daily Giving
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
          Where to give
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Select an appeal and when to give. You’ll donate this amount each day.
        </p>
      </div>

      <div className="rounded-xl border bg-muted/40 dark:bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">£{amountPounds} per day</p>
      </div>

      <div className="space-y-2">
        <Label className="text-base">When to give</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === "daily" ? "default" : "outline"} className="h-11 rounded-lg" onClick={() => setMode("daily")}>
            Daily during Ramadhan
          </Button>
          <Button type="button" variant={mode === "last10" ? "default" : "outline"} className="h-11 rounded-lg" onClick={() => setMode("last10")}>
            Last 10 nights
          </Button>
        </div>
        <p className="text-sm font-medium text-foreground">
          {mode === "daily"
            ? `You’ll donate £${amountPounds} every day until end of Ramadhan.`
            : "Choose every night or odd nights only during the last 10 nights of Ramadhan."}
        </p>
        {mode === "last10" && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant={last10Option === "every" ? "default" : "outline"} className="h-11 rounded-lg" onClick={() => setLast10Option("every")}>
              Every night ({LAST_10_NIGHTS_COUNT})
            </Button>
            <Button type="button" variant={last10Option === "odd" ? "default" : "outline"} className="h-11 rounded-lg" onClick={() => setLast10Option("odd")}>
              Odd nights only ({LAST_10_ODD_NIGHTS_COUNT})
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-base">Appeal</Label>
        <div className="grid grid-cols-2 gap-2">
          {appeals.map((a) => (
            <Button
              key={a.id}
              type="button"
              variant={selectedAppealId === a.id ? "default" : "outline"}
              className="h-11 rounded-lg text-center justify-center px-4 py-3 font-normal"
              onClick={() => setSelectedAppealId(a.id)}
            >
              <span className="line-clamp-2">{a.title}</span>
            </Button>
          ))}
        </div>
      </div>

      {showZakatCard && (
        <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">Count as Zakat where applicable</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={countAsZakat} onCheckedChange={(c) => setCountAsZakat(c === true)} />
            <span className="text-sm text-muted-foreground">When an appeal is Zakat-verified, count it as your Zakat.</span>
          </label>
        </div>
      )}

      {dayCount > 0 && amountPerDayPence > 0 && !calcError && (
        <p className="text-sm font-medium text-foreground">
          {formatCurrency(amountPerDayPence)} per {mode === "last10" ? "night" : "day"} × {dayCount} {mode === "last10" ? "nights" : "days"} = {formatCurrency(totalPence)} total over this period.
        </p>
      )}
      {calcError && <p className="text-sm text-destructive">{calcError}</p>}

      <Button
        onClick={() => setStep(3)}
        size="lg"
        className="w-full rounded-full h-12 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={!selectedAppealId || !donationType || !!calcError || dayCount < 1 || amountPerDayPence <= 0 || checkoutItems.length === 0}
      >
        Nearly there
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}
