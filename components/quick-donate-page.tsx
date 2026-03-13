"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency, formatCurrencyWhole } from "@/lib/utils"
import { ChevronDown, Wand2, HandHeart } from "lucide-react"

type DonationType = "GENERAL" | "SADAQAH" | "ZAKAT" | "LILLAH"

type QuickDonateAppeal = {
  id: string
  title: string
  donationTypesEnabled: DonationType[]
}

interface QuickDonatePageProps {
  appeals: QuickDonateAppeal[]
  stripePublishableKey: string
}

const AMOUNT_PRESETS_PENCE = [1000, 2500, 5000] // £10, £25, £50

type QuickOrderInfo = {
  orderId: string
  orderNumber: string
  paymentClientSecret: string
  paymentIntentId: string
}

function QuickDonatePaymentStep(props: {
  clientSecret: string
  order: QuickOrderInfo
  totalPence: number
  onBack: () => void
  onSuccess: (orderId: string) => void
}) {
  const { clientSecret, order, totalPence, onBack, onSuccess } = props
  const stripe = useStripe()
  const elements = useElements()
  const { resolvedTheme } = useTheme()
  const [submitting, setSubmitting] = React.useState(false)
  const [paymentError, setPaymentError] = React.useState<string | null>(null)
  const [paymentRequest, setPaymentRequest] =
    React.useState<
      ReturnType<NonNullable<ReturnType<typeof useStripe>>["paymentRequest"]> | null
    >(null)
  const [walletLabel, setWalletLabel] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function setup() {
      if (!stripe) return
      const pr = stripe.paymentRequest({
        country: "GB",
        currency: "gbp",
        total: { label: "Donation total", amount: totalPence },
        requestPayerName: true,
        requestPayerEmail: true,
      })
      const result = await pr.canMakePayment()
      if (cancelled) return
      if (result) {
        setPaymentRequest(pr)
        const payResult = result as { applePay?: boolean; googlePay?: boolean }
        if (payResult.applePay) setWalletLabel("Apple Pay")
        else if (payResult.googlePay) setWalletLabel("Google Pay")
        else setWalletLabel("Wallet Pay")

        pr.on("paymentmethod", async (ev) => {
          try {
            if (!stripe) throw new Error("Payment system not ready.")
            setSubmitting(true)
            setPaymentError(null)

            const { error, paymentIntent } = await stripe.confirmCardPayment(
              clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: false },
            )

            if (error) {
              ev.complete("fail")
              setPaymentError(error.message || "Payment failed. Please try again.")
              return
            }

            ev.complete("success")

            if (paymentIntent && paymentIntent.status === "requires_action") {
              const { error: actionError } = await stripe.confirmCardPayment(clientSecret)
              if (actionError) {
                setPaymentError(
                  actionError.message || "Payment failed. Please try again.",
                )
                return
              }
            }

            try {
              await fetch("/api/checkout/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderNumber: order.orderNumber,
                  paymentIntentId: order.paymentIntentId,
                }),
              })
            } catch {
              // ignore
            }

            onSuccess(order.orderId)
          } catch (err) {
            setPaymentError(
              err instanceof Error ? err.message : "Payment failed. Please try again.",
            )
          } finally {
            setSubmitting(false)
          }
        })
      }
    }
    void setup()
    return () => {
      cancelled = true
    }
  }, [stripe, clientSecret, totalPence, order.orderId, order.orderNumber, order.paymentIntentId, onSuccess])

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentError(null)
    setSubmitting(true)
    try {
      if (!stripe || !elements) {
        throw new Error("Payment system not ready. Please try again.")
      }

      const confirm = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success/${order.orderId}`,
        },
        redirect: "if_required",
      })

      if (confirm.error) {
        setPaymentError(confirm.error.message || "Payment failed. Please try again.")
        return
      }

      try {
        await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber: order.orderNumber,
            paymentIntentId: order.paymentIntentId,
          }),
        })
      } catch {
        // ignore
      }

      onSuccess(order.orderId)
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : "Payment failed. Please try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="space-y-4 pt-0">
          {paymentRequest && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {walletLabel ?? "Apple Pay / Google Pay"}
              </p>
              <div className="rounded-md border bg-background px-3 py-3">
                <PaymentRequestButtonElement
                  options={{
                    paymentRequest,
                    style: {
                      paymentRequestButton: {
                        theme: resolvedTheme === "dark" ? "dark" : "light",
                        height: "44px",
                      },
                    },
                  }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or pay by card</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <div className="rounded-md border bg-background px-3 py-3">
            <PaymentElement />
          </div>
          {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
              Back
            </Button>
            <Button type="submit" size="lg" disabled={submitting || !stripe || !elements}>
              {submitting ? "Processing..." : "Donate now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export function QuickDonatePage({ appeals, stripePublishableKey }: QuickDonatePageProps) {
  const router = useRouter()
  const stripePromise = React.useMemo(
    () => loadStripe(stripePublishableKey),
    [stripePublishableKey],
  )

  const [selectedAmountPence, setSelectedAmountPence] = React.useState<number | null>(2500)
  const [customAmount, setCustomAmount] = React.useState("")
  const [impactMode, setImpactMode] = React.useState<"auto" | "choose">("auto")
  const [selectedAppealId, setSelectedAppealId] = React.useState<string | null>(
    appeals[0]?.id ?? null,
  )
  const [isZakat, setIsZakat] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [creatingPayment, setCreatingPayment] = React.useState(false)
  const [orderInfo, setOrderInfo] = React.useState<QuickOrderInfo | null>(null)
  const [clientSecret, setClientSecret] = React.useState<string | null>(null)
  const [autoStarted, setAutoStarted] = React.useState(false)
  const [lastAmountPence, setLastAmountPence] = React.useState<number | null>(null)

  const mostNeedyAppeal = appeals[0] ?? null

  const effectiveAppeal =
    impactMode === "auto"
      ? mostNeedyAppeal
      : appeals.find((a) => a.id === selectedAppealId) ?? mostNeedyAppeal

  const baseAmountPence =
    selectedAmountPence ??
    (customAmount ? Math.round(Number(customAmount || "0") * 100) || 0 : 0)

  const totalPence = baseAmountPence

  const canSubmit =
    !!effectiveAppeal && baseAmountPence > 0 && Number.isFinite(baseAmountPence)

  const handleCreatePayment = async () => {
    if (!canSubmit || !effectiveAppeal) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setEmailError("Enter a valid email for your receipt.")
      return
    }
    setEmailError(null)
    setCreatingPayment(true)
    try {
      const items = [
        {
          appealId: effectiveAppeal.id,
          appealTitle: effectiveAppeal.title,
          frequency: "ONE_OFF" as const,
          donationType: (isZakat ? "ZAKAT" : "GENERAL") as DonationType,
          amountPence: baseAmountPence,
        },
      ]

      const response = await fetch("/api/checkout/create-express", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          email: trimmedEmail,
          subtotalPence: baseAmountPence,
          coverFees: false,
          giftAid: false,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Could not start payment.")
      }

      const data = (await response.json()) as QuickOrderInfo
      setOrderInfo(data)
      setClientSecret(data.paymentClientSecret)
      setLastAmountPence(baseAmountPence)
    } catch (error) {
      setEmailError(
        error instanceof Error ? error.message : "Something went wrong. Please try again.",
      )
    } finally {
      setCreatingPayment(false)
    }
  }

  React.useEffect(() => {
    if (!autoStarted && !clientSecret && canSubmit) {
      const trimmedEmail = email.trim()
      if (trimmedEmail && trimmedEmail.includes("@")) {
        setAutoStarted(true)
        void handleCreatePayment()
      }
    }
  }, [autoStarted, clientSecret, canSubmit, email])

  React.useEffect(() => {
    if (clientSecret && lastAmountPence !== null && baseAmountPence !== lastAmountPence) {
      setClientSecret(null)
      setOrderInfo(null)
      setLastAmountPence(null)
      setAutoStarted(false)
    }
  }, [baseAmountPence, clientSecret, lastAmountPence])

  const handlePresetClick = (amountPence: number) => {
    setSelectedAmountPence(amountPence)
    setCustomAmount("")
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 sm:max-w-lg sm:px-0 sm:py-8">
      <section className="space-y-4">
        <div className="space-y-0.5 text-foreground">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Introducing
          </h1>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Quick Donate
          </h1>
          <p className="max-w-md text-sm text-muted-foreground sm:text-base">
            Give in seconds, earn reward that lasts.
          </p>
        </div>

        <div className="space-y-6 pt-5">
            {/* Amount */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl font-semibold text-foreground sm:text-2xl">
                  Your giving amount
                </span>
              </div>

              <div className="flex gap-2">
                {AMOUNT_PRESETS_PENCE.map((amount) => {
                  const isActive = selectedAmountPence === amount && !customAmount
                  return (
                    <Button
                      key={amount}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="h-11 flex-1 rounded-full text-lg sm:text-xl font-semibold"
                      onClick={() => handlePresetClick(amount)}
                    >
                      {formatCurrencyWhole(amount)}
                    </Button>
                  )
                })}
                <Button
                  type="button"
                  variant={customAmount ? "default" : "outline"}
                  size="sm"
                  className="h-11 flex-[1.5] rounded-full px-4 sm:px-5 text-lg sm:text-xl font-semibold"
                  onClick={() => {
                    setSelectedAmountPence(null)
                    if (!customAmount) {
                      setCustomAmount("25")
                    }
                  }}
                >
                  Custom
                </Button>
              </div>

              {selectedAmountPence === null && (
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                    £
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    className="h-14 w-full rounded-xl border border-input bg-background/95 pl-9 pr-4 text-right text-2xl font-semibold tracking-tight text-foreground outline-none ring-0 transition focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:outline-none"
                    value={customAmount || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      setCustomAmount(value)
                      setSelectedAmountPence(null)
                    }}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 text-xl sm:text-2xl">
                <Checkbox
                  id="zakat"
                  checked={isZakat}
                  onCheckedChange={(checked) => setIsZakat(checked === true)}
                  className="size-6"
                />
                <Label
                  htmlFor="zakat"
                  className="flex items-center gap-1 font-medium text-muted-foreground"
                >
                  Count this as your Zakat
                </Label>
              </div>
            </div>

            {/* Impact */}
            {appeals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    Choose your impact
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Alianah-verified campaigns
                  </span>
                </div>

                <Tabs
                  value={impactMode}
                  onValueChange={(value) =>
                    setImpactMode(value === "choose" ? "choose" : "auto")
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/80 p-1 h-14">
                    <TabsTrigger
                      value="auto"
                      className="inline-flex h-full items-center justify-center gap-1.5 rounded-full text-sm font-medium sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Wand2 className="h-4 w-4" />
                      <span>Our choice</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="choose"
                      className="inline-flex h-full items-center justify-center gap-1.5 rounded-full text-sm font-medium sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <HandHeart className="h-4 w-4" />
                      <span>I&apos;ll choose</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {impactMode === "auto" ? (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
                    <p className="font-semibold text-foreground">
                      We&apos;ll take care of it
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your donation goes to impactful, verified appeals where it&apos;s
                      needed most.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground sm:text-sm">
                      Destination
                    </Label>
                    <Select
                      value={selectedAppealId ?? undefined}
                      onValueChange={(value) => setSelectedAppealId(value)}
                    >
                      <SelectTrigger className="h-14 w-full rounded-xl border-muted bg-muted/70 text-sm sm:text-base">
                        <SelectValue placeholder="Select a campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {appeals.map((appeal) => (
                          <SelectItem key={appeal.id} value={appeal.id}>
                            {appeal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Tip + summary removed per design request */}

            {/* Email + payment */}
            {!clientSecret ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="quick-email"
                    className="text-sm font-semibold text-foreground"
                  >
                    Email for your receipt
                  </Label>
                  <input
                    id="quick-email"
                    type="email"
                    className="h-10 w-full rounded-xl border border-muted bg-muted/50 px-3 text-base outline-none ring-0 transition focus:border-primary focus:bg-background"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                  {!emailError && (
                    <p className="text-[11px] text-muted-foreground">
                      Next you&apos;ll choose Apple Pay / Google Pay (if available) or pay by
                      card on this page.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  className="h-11 w-full rounded-full text-sm font-semibold"
                  disabled={!canSubmit || creatingPayment}
                  onClick={handleCreatePayment}
                >
                  {creatingPayment
                    ? "Preparing payment..."
                    : totalPence > 0
                      ? `Continue to payment (${formatCurrency(totalPence)})`
                      : "Continue to payment"}
                </Button>
              </div>
            ) : orderInfo && stripePromise ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "night",
                  },
                }}
                key={clientSecret}
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      Choose payment method
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pay with Apple Pay / Google Pay where available, or enter card details
                      securely below.
                    </p>
                  </div>
                  <QuickDonatePaymentStep
                    clientSecret={clientSecret}
                    order={orderInfo}
                    totalPence={totalPence}
                    onBack={() => {
                      setClientSecret(null)
                      setOrderInfo(null)
                    }}
                    onSuccess={(orderId) => {
                      router.push(`/success/${orderId}`)
                    }}
                  />
                </div>
              </Elements>
            ) : null}
        </div>
      </section>
    </div>
  )
}

