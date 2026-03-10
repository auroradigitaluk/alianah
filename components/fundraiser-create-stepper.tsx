"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Heart, Loader2, ArrowRight, Minus, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export type EligibleCampaign =
  | {
      id: string
      title: string
      slug: string
      summary: string | null
      type: "APPEAL"
      fundraisingDefaultMessage?: string | null
    }
  | {
      id: string
      title: string
      slug: string
      summary: string | null
      type: "WATER"
      projectType: string
      plaqueAvailable: boolean
      fundraisingDefaultMessage?: string | null
    }

const TOTAL_STEPS = 7
const PRESET_AMOUNTS_PENCE = [100000, 250000, 500000, 1000000] // £1000, £2500, £5000, £10000

interface FundraiserCreateStepperProps {
  eligibleCampaigns: EligibleCampaign[]
  initialCampaignId?: string | null
}

export function FundraiserCreateStepper({ eligibleCampaigns, initialCampaignId }: FundraiserCreateStepperProps) {
  const router = useRouter()
  const [step, setStep] = React.useState(0)

  // Step 0–1: auth
  const [email, setEmail] = React.useState("")
  const [otp, setOtp] = React.useState("")
  const [authLoading, setAuthLoading] = React.useState(false)
  const [authError, setAuthError] = React.useState("")
  const [otpSent, setOtpSent] = React.useState(false)

  // Step 2: profile (first name, last name)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [profileSaved, setProfileSaved] = React.useState(false)
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [profileError, setProfileError] = React.useState("")

  // Step 3: campaign
  const [selectedCampaign, setSelectedCampaign] = React.useState<EligibleCampaign | null>(null)

  // Step 3: amount (appeal: target; water: country + quantity + plaque)
  const [targetAmountPence, setTargetAmountPence] = React.useState<number | null>(null)
  const [targetInputValue, setTargetInputValue] = React.useState("")
  const [waterCountries, setWaterCountries] = React.useState<
    Array<{ id: string; country: string; pricePence: number }>
  >([])
  const [waterCountryId, setWaterCountryId] = React.useState("")
  const [waterQuantity, setWaterQuantity] = React.useState(1)
  const [plaqueName, setPlaqueName] = React.useState("")

  // Step 4: title & details
  const [title, setTitle] = React.useState("")
  const [fundraiserName, setFundraiserName] = React.useState("")
  const [message, setMessage] = React.useState("")

  // Step 5: submit
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")
  const [sessionChecked, setSessionChecked] = React.useState(false)

  const isWater = selectedCampaign?.type === "WATER"

  // Preselect campaign when coming from a specific appeal/water project
  React.useEffect(() => {
    if (!initialCampaignId || selectedCampaign) return
    const found = eligibleCampaigns.find((c) => c.id === initialCampaignId)
    if (found) {
      setSelectedCampaign(found)
    }
  }, [initialCampaignId, eligibleCampaigns, selectedCampaign])

  // If already logged in (e.g. from dashboard), fetch profile and skip to campaign or profile step
  React.useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/fundraisers/me").then(
        (res) => res.json() as Promise<{ email?: string | null }>
      ),
      fetch("/api/fundraisers/profile").then(async (res) => {
        if (res.status === 404 || res.status === 401) return null
        if (!res.ok) return null
        try {
          return (await res.json()) as { firstName?: string; lastName?: string }
        } catch {
          return null
        }
      }),
    ])
      .then(([me, profile]) => {
        if (cancelled || !me?.email) return
        setEmail(me.email)
        if (profile) {
          setFirstName(profile.firstName ?? "")
          setLastName(profile.lastName ?? "")
          setProfileSaved(true)
          setStep(3)
        } else {
          setStep(2)
        }
      })
      .finally(() => setSessionChecked(true))
    return () => {
      cancelled = true
    }
  }, [])

  // Pre-fill "Why are you fundraising?" from the campaign's fundraising description (admin) when entering step 5
  React.useEffect(() => {
    if (step !== 5 || !selectedCampaign) return
    const defaultMsg = selectedCampaign.fundraisingDefaultMessage
    if (defaultMsg && typeof defaultMsg === "string" && defaultMsg.trim() && !message.trim()) {
      setMessage(defaultMsg.trim())
    }
  }, [step, selectedCampaign?.id, selectedCampaign?.fundraisingDefaultMessage, message])
  const campaignTitle = selectedCampaign?.title ?? ""

  // Fetch water countries when water campaign selected
  React.useEffect(() => {
    if (selectedCampaign?.type !== "WATER" || !("projectType" in selectedCampaign)) return
    fetch(`/api/water-projects/countries?projectType=${selectedCampaign.projectType}`)
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          setWaterCountries([])
          return
        }
        const list = data
          .filter(
            (c): c is { id: string; country: string; pricePence: number } =>
              typeof c === "object" &&
              c !== null &&
              "id" in c &&
              "country" in c &&
              "pricePence" in c &&
              typeof (c as { id?: unknown }).id === "string" &&
              typeof (c as { country?: unknown }).country === "string" &&
              typeof (c as { pricePence?: unknown }).pricePence === "number"
          )
          .map((c) => ({ id: c.id, country: c.country, pricePence: c.pricePence }))
        setWaterCountries(list)
        setWaterCountryId("")
        setWaterQuantity(1)
        setTargetAmountPence(null)
      })
      .catch(() => setWaterCountries([]))
  }, [selectedCampaign])

  // Sync water target from country × quantity
  React.useEffect(() => {
    if (!isWater || !waterCountryId) {
      setTargetAmountPence(null)
      return
    }
    const c = waterCountries.find((x) => x.id === waterCountryId)
    if (!c) return
    setTargetAmountPence(c.pricePence * Math.max(1, waterQuantity))
  }, [isWater, waterCountryId, waterQuantity, waterCountries])

  const progressFraction = (step + 1) / TOTAL_STEPS

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) return
    setAuthError("")
    setAuthLoading(true)
    try {
      const res = await fetch("/api/fundraisers/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send code")
      }
      setOtpSent(true)
      setStep(1)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to send code")
    } finally {
      setAuthLoading(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || otp.length !== 6) return
    setAuthError("")
    setAuthLoading(true)
    try {
      const res = await fetch("/api/fundraisers/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otp }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Invalid code")
      }
      setStep(2)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Invalid code")
    } finally {
      setAuthLoading(false)
    }
  }

  const saveProfileAndContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError("First name and last name are required")
      return
    }
    setProfileError("")
    setProfileSaving(true)
    try {
      const res = await fetch("/api/fundraisers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setProfileSaved(true)
      setFundraiserName(`${firstName.trim()} ${lastName.trim()}`)
      setStep(3)
    } catch {
      setProfileError("Failed to save. Please try again.")
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePreset = (pence: number) => {
    setTargetAmountPence(pence)
    setTargetInputValue((pence / 100).toFixed(2))
  }

  const handleFinalise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCampaign || !email.trim() || !fundraiserName.trim()) return
    const target = isWater ? targetAmountPence : targetAmountPence
    if (target == null || target < 1) return
    if (isWater && selectedCampaign.type === "WATER") {
      if (!waterCountryId) return
      if (selectedCampaign.plaqueAvailable && !plaqueName.trim()) return
    }

    setSubmitError("")
    setSubmitting(true)
    try {
      const effectiveTitle =
      title && title.trim()
        ? title.trim()
        : fundraiserName.trim()
          ? `${fundraiserName.trim()} is fundraising for ${campaignTitle}`
          : `Fundraising for ${campaignTitle}`
    const payload: Record<string, unknown> = {
        email: email.trim(),
        fundraiserName: fundraiserName.trim(),
        title: effectiveTitle,
        message: message.trim() || undefined,
        targetAmountPence: target,
      }
      if (selectedCampaign.type === "APPEAL") {
        payload.appealId = selectedCampaign.id
      } else {
        payload.waterProjectId = selectedCampaign.id
        payload.waterProjectCountryId = waterCountryId
        if (selectedCampaign.plaqueAvailable && plaqueName.trim()) {
          payload.plaqueName = plaqueName.trim()
        }
      }

      const res = await fetch("/api/fundraisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.requiresLogin) {
          setAuthError(data.message || "Please log in to create another fundraiser.")
          setStep(0)
          return
        }
        throw new Error(data.error || data.message || "Failed to create fundraiser")
      }

      const data = await res.json()
      if (data.slug) {
        router.push(`/fundraiser/create/live/${data.slug}`)
        return
      }
      throw new Error("No slug returned")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  // —— Step 0: Email ———
  if (step === 0) {
    return (
      <div className="flex flex-col justify-center items-center text-center w-full max-w-md mx-auto px-4 py-12">
        <Image
          src="/logo-light.png"
          alt="Alianah"
          width={200}
          height={80}
          className="h-16 sm:h-20 w-auto object-contain mb-6 dark:hidden"
          priority
        />
        <Image
          src="/logo-dark.png"
          alt="Alianah"
          width={200}
          height={80}
          className="h-16 sm:h-20 w-auto object-contain mb-6 hidden dark:block"
          priority
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mx-auto mb-4">
          <Heart className="size-4" />
          Create fundraiser
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
          Enter your email
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          We&apos;ll send you a one-time code to continue.
        </p>
        <form onSubmit={sendOtp} className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={authLoading}
              className="h-11"
            />
          </div>
          {authError && <p className="text-sm text-destructive">{authError}</p>}
          <Button type="submit" className="w-full h-11" disabled={authLoading}>
            {authLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send code"
            )}
          </Button>
        </form>
      </div>
    )
  }

  // —— Step 1: OTP ———
  if (step === 1) {
    return (
      <div className="space-y-8 pb-20">
        <button
          type="button"
          onClick={() => setStep(0)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressFraction * 100}%` }}
            aria-hidden
          />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Heart className="size-4" />
            Create fundraiser
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Enter the code we sent
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Check your inbox for {email}. Code is valid for a few minutes.
          </p>
        </div>
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">6-digit code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              disabled={authLoading}
              className="text-center text-2xl tracking-widest h-12"
            />
          </div>
          {authError && <p className="text-sm text-destructive">{authError}</p>}
          <Button type="submit" className="w-full h-11" disabled={authLoading || otp.length !== 6}>
            {authLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify and continue"
            )}
          </Button>
        </form>
      </div>
    )
  }

  // —— Step 2: Your details (first name, last name) ———
  if (step === 2) {
    return (
      <div className="space-y-8 pb-20">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressFraction * 100}%` }}
            aria-hidden
          />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Heart className="size-4" />
            Create fundraiser
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Your details
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Enter your first and last name. This will be used on your fundraiser page.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              transform="titleCase"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              transform="titleCase"
              className="h-11"
            />
          </div>
          {profileError && <p className="text-sm text-destructive">{profileError}</p>}
          <Button
            className="w-full h-11"
            disabled={profileSaving || !firstName.trim() || !lastName.trim()}
            onClick={saveProfileAndContinue}
          >
            {profileSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // —— Step 3: Choose campaign ———
  if (step === 3) {
    return (
      <div className="space-y-8 pb-20">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressFraction * 100}%` }}
            aria-hidden
          />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Heart className="size-4" />
            Create fundraiser
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Choose a campaign
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Select the cause you want to fundraise for.
          </p>
        </div>
        <div className="grid gap-3">
          {eligibleCampaigns.map((campaign) => {
            const isSelected = selectedCampaign?.id === campaign.id
            return (
              <button
                key={campaign.id}
                type="button"
                onClick={() => setSelectedCampaign(campaign)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-muted/30 hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <div className="font-medium text-foreground">{campaign.title}</div>
                {campaign.summary && (
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {campaign.summary}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <Button
          className="w-full h-11"
          disabled={!selectedCampaign}
          onClick={() => setStep(4)}
        >
          Continue
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    )
  }

  // —— Step 4: Amount ———
  if (step === 4) {
    const showPresets = !isWater
    const amountValid = targetAmountPence != null && targetAmountPence > 0
    const plaqueOk =
      !isWater ||
      !(selectedCampaign && "plaqueAvailable" in selectedCampaign && selectedCampaign.plaqueAvailable) ||
      plaqueName.trim().length > 0

    return (
      <div className="space-y-8 pb-20">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressFraction * 100}%` }}
            aria-hidden
          />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Heart className="size-4" />
            Create fundraiser
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Choose your target
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {isWater
              ? "Select a country and quantity. Your target is set automatically."
              : "Set how much you want to raise."}
          </p>
        </div>

        {isWater && (
          <>
            <div className="space-y-2">
              <Label>Country</Label>
              <div className="grid grid-cols-2 gap-2">
                {waterCountries
                  .slice()
                  .sort((a, b) => a.pricePence - b.pricePence || a.country.localeCompare(b.country))
                  .map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={waterCountryId === c.id ? "default" : "outline"}
                      className="h-auto py-3 flex flex-col items-center"
                      onClick={() => setWaterCountryId(c.id)}
                    >
                      <span className="text-sm font-medium">{c.country}</span>
                      <span className="text-xs opacity-90">{formatCurrency(c.pricePence)}</span>
                    </Button>
                  ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setWaterQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="text-lg font-semibold w-8 text-center">{waterQuantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setWaterQuantity((q) => q + 1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            {selectedCampaign && "plaqueAvailable" in selectedCampaign && selectedCampaign.plaqueAvailable && (
              <div className="space-y-2">
                <Label htmlFor="plaque">Name on plaque *</Label>
                <Input
                  id="plaque"
                  value={plaqueName}
                  onChange={(e) => setPlaqueName(e.target.value)}
                  placeholder="Name to appear on plaque"
                />
              </div>
            )}
            {targetAmountPence != null && targetAmountPence > 0 && (
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium">Target: {formatCurrency(targetAmountPence)}</p>
              </div>
            )}
          </>
        )}

        {showPresets && (
          <>
            <div className="space-y-2">
              <Label>Preset amounts</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_AMOUNTS_PENCE.map((pence) => (
                  <Button
                    key={pence}
                    type="button"
                    variant={targetAmountPence === pence ? "default" : "outline"}
                    className="h-11"
                    onClick={() => handlePreset(pence)}
                  >
                    {formatCurrency(pence)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Or enter amount (£)</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={targetInputValue}
                onChange={(e) => {
                  const v = e.target.value
                  setTargetInputValue(v)
                  const n = parseFloat(v)
                  if (!isNaN(n) && n > 0) setTargetAmountPence(Math.round(n * 100))
                  else setTargetAmountPence(null)
                }}
              />
            </div>
          </>
        )}

        <Button
          className="w-full h-11"
          disabled={!amountValid || !plaqueOk}
          onClick={() => setStep(5)}
        >
          Continue
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    )
  }

  // —— Step 5: Title & name ———
  if (step === 5) {
    const defaultTitle =
      fundraiserName.trim()
        ? `${fundraiserName.trim()} is fundraising for ${campaignTitle}`
        : firstName.trim() && lastName.trim()
          ? `${firstName.trim()} ${lastName.trim()} is fundraising for ${campaignTitle}`
          : `Fundraising for ${campaignTitle}`

    return (
      <div className="space-y-8 pb-20">
        <button
          type="button"
          onClick={() => setStep(4)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressFraction * 100}%` }}
            aria-hidden
          />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Heart className="size-4" />
            Create fundraiser
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Campaign title & your name
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            This will appear on your public fundraiser page.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setStep(6)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Campaign title</Label>
            <Input
              id="title"
              value={title || defaultTitle}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Your name *</Label>
            <Input
              id="name"
              value={fundraiserName}
              onChange={(e) => setFundraiserName(e.target.value)}
              placeholder="Display name"
              required
              transform="titleCase"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Why are you fundraising? (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your story..."
              rows={3}
              className="resize-none"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={!fundraiserName.trim()}>
            Continue
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </form>
      </div>
    )
  }

  // —— Step 6: Finalise ———
  if (step === 6) {
    const target = isWater ? targetAmountPence : targetAmountPence
    const displayTitle =
      title && title.trim()
        ? title.trim()
        : fundraiserName.trim()
          ? `${fundraiserName.trim()} is fundraising for ${campaignTitle}`
          : campaignTitle

    return (
      <div className="space-y-8 pb-20">
        <button
          type="button"
          onClick={() => setStep(5)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back
        </button>
        <div className="w-full h-1.5 rounded-full bg-primary/20 overflow-hidden flex">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressFraction * 100}%` }}
            aria-hidden
          />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mb-4">
            <Heart className="size-4" />
            Create fundraiser
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            Review and go live
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Check the details below, then click to create your campaign.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Title:</span> {displayTitle}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Your name:</span> {fundraiserName}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Campaign:</span> {campaignTitle}
          </p>
          {target != null && target > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">Target:</span> {formatCurrency(target)}
            </p>
          )}
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={submitting}
          onClick={handleFinalise}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create my fundraiser"
          )}
        </Button>
      </div>
    )
  }

  return null
}
