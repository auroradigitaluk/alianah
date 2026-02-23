"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useForm } from "react-hook-form"
import type { Resolver, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { formatCurrency } from "@/lib/utils"

const fundraiserSchema = z.object({
  title: z.string().min(1, "Fundraiser name is required"),
  fundraiserName: z.string().min(1, "Your name is required"),
  email: z.string().email("Valid email is required"),
  message: z.string().optional(),
  targetAmountPence: z.string()
    .min(1, "Target amount is required")
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num > 0
    }, {
      message: "Target amount must be greater than 0"
    })
    .transform((val) => {
      const num = parseFloat(val)
      return Math.round(num * 100)
    }),
})

type FundraiserFormData = z.infer<typeof fundraiserSchema>

interface FundraiserFormProps {
  appealId?: string
  waterProjectId?: string
  waterProjectType?: string
  campaignTitle: string
  defaultMessage?: string | null
  plaqueAvailable?: boolean
}

export function FundraiserForm({
  appealId,
  waterProjectId,
  waterProjectType,
  campaignTitle,
  defaultMessage,
  plaqueAvailable,
}: FundraiserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const previousNameRef = React.useRef<string>("")
  const hasUserEditedTitleRef = React.useRef(false)
  const [countries, setCountries] = React.useState<Array<{ id: string; country: string; pricePence: number }>>([])
  const [selectedCountryId, setSelectedCountryId] = React.useState<string>("")
  const [quantity, setQuantity] = React.useState<number>(1)
  const [plaqueName, setPlaqueName] = React.useState("")

  type FormInput = z.input<typeof fundraiserSchema>
  type FormOutput = z.output<typeof fundraiserSchema>

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(fundraiserSchema) as unknown as Resolver<FormInput>,
    defaultValues: {
      title: campaignTitle,
      message: defaultMessage || "",
    },
  })

  const targetAmountPence = watch("targetAmountPence")
  const fundraiserName = watch("fundraiserName")
  const message = watch("message")

  const getFundraiserTitle = React.useCallback(() => {
    const selectedCountry = countries.find((c) => c.id === selectedCountryId)
    const countryLabel = waterProjectId && selectedCountry ? `${selectedCountry.country} ` : ""
    if (fundraiserName) {
      return `${fundraiserName} is fundraising for ${countryLabel}${campaignTitle}`
    }
    return `Fundraising for ${countryLabel}${campaignTitle}`
  }, [campaignTitle, countries, fundraiserName, selectedCountryId, waterProjectId])

  // Auto-fill title from name/campaign; only update when user hasn't edited it
  React.useEffect(() => {
    if (!hasUserEditedTitleRef.current) {
      setValue("title", getFundraiserTitle())
    }
  }, [getFundraiserTitle, setValue])

  React.useEffect(() => {
    if (!waterProjectType) return
    fetch(`/api/water-projects/countries?projectType=${waterProjectType}`)
      .then((res) => res.json())
      .then((data: unknown) => {
        if (!Array.isArray(data)) {
          setCountries([])
          return
        }
        const filtered = data
          .filter((c): c is { id: string; country: string; pricePence: number; projectType: string; isActive?: boolean } => {
            return (
              typeof c === "object" &&
              c !== null &&
              "id" in c &&
              "country" in c &&
              "pricePence" in c &&
              "projectType" in c &&
              typeof (c as { id?: unknown }).id === "string" &&
              Boolean((c as { id?: string }).id?.trim()) &&
              typeof (c as { country?: unknown }).country === "string" &&
              typeof (c as { pricePence?: unknown }).pricePence === "number" &&
              (c as { projectType?: unknown }).projectType === waterProjectType &&
              (c as { isActive?: unknown }).isActive !== false
            )
          })
          .map((c) => ({ id: c.id, country: c.country, pricePence: c.pricePence }))
        setCountries(filtered)
      })
      .catch((err) => {
        console.error("Error fetching countries:", err)
        setCountries([])
      })
  }, [waterProjectType])

  React.useEffect(() => {
    if (!waterProjectId) return
    const selected = countries.find((c) => c.id === selectedCountryId)
    const totalPence = selected ? selected.pricePence * Math.max(1, quantity) : 0
    if (!selected) {
      setValue("targetAmountPence", "", { shouldValidate: true })
      return
    }
    setValue("targetAmountPence", (totalPence / 100).toFixed(2), { shouldValidate: true })
  }, [countries, quantity, selectedCountryId, setValue, waterProjectId])

  const presetAmounts = [100000, 250000, 500000, 1000000] // £1000, £2500, £5000, £10000 in pence

  const handlePresetClick = (amountPence: number) => {
    const amountInPounds = (amountPence / 100).toString()
    setValue("targetAmountPence", amountInPounds, { shouldValidate: true })
  }

  const isPresetSelected = (amountPence: number) => {
    if (!targetAmountPence) return false
    const amountInPounds = amountPence / 100
    const currentValue = parseFloat(String(targetAmountPence))
    return !isNaN(currentValue) && Math.abs(currentValue - amountInPounds) < 0.01
  }

  // Generate default message with fundraiser name
  const getDefaultMessage = () => {
    if (defaultMessage && defaultMessage.trim()) {
      return defaultMessage
    }
    if (fundraiserName) {
      return `${fundraiserName} is fundraising for ${campaignTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
    }
    return `I am fundraising for ${campaignTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
  }

  // Seed the message from defaultMessage when provided
  React.useEffect(() => {
    if (!defaultMessage || defaultMessage.trim().length === 0) return
    const currentMessage = message || ""
    if (!currentMessage.trim()) {
      setValue("message", defaultMessage, { shouldDirty: false })
    }
  }, [defaultMessage, message, setValue])

  // Update message when fundraiser name changes (only if message is empty or matches default pattern)
  React.useEffect(() => {
    if (fundraiserName && fundraiserName !== previousNameRef.current) {
      previousNameRef.current = fundraiserName
      const currentMessage = message || ""
      // Only update if message is empty or matches the default pattern (contains "fundraising for")
      if (
        !defaultMessage &&
        (!currentMessage ||
          (currentMessage.includes("fundraising for") && currentMessage.includes(campaignTitle)))
      ) {
        const newMessage = `${fundraiserName} is fundraising for ${campaignTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
        setValue("message", newMessage, { shouldDirty: false })
      }
    }
  }, [fundraiserName, campaignTitle, defaultMessage, setValue, message])

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    setValue("title", getFundraiserTitle(), { shouldValidate: false })
    // Resolver already validated and transformed; data may have output types (e.g. targetAmountPence as number)
    const payload: FormOutput = {
      ...data,
      title: (data.title?.trim()) ? data.title : getFundraiserTitle(),
      targetAmountPence: typeof data.targetAmountPence === "number" ? data.targetAmountPence : Math.round(parseFloat(String(data.targetAmountPence)) * 100),
    }
    setLoading(true)
    try {
      if (waterProjectId && !selectedCountryId) {
        throw new Error("Please select a country for your fundraiser.")
      }
      if (waterProjectId && plaqueAvailable && !plaqueName.trim()) {
        throw new Error("Please enter a name for the plaque.")
      }
      const response = await fetch("/api/fundraisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(appealId ? { appealId } : {}),
          ...(waterProjectId ? { waterProjectId } : {}),
          ...(waterProjectId && selectedCountryId ? { waterProjectCountryId: selectedCountryId } : {}),
          ...(waterProjectId && plaqueAvailable && plaqueName.trim() ? { plaqueName: plaqueName.trim() } : {}),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // If email already exists, redirect to login
        if (errorData.requiresLogin) {
          // Get current path to redirect back to the same appeal page
          const currentPath = window.location.pathname
          const loginUrl = `/fundraise/login?redirect=${encodeURIComponent(currentPath)}&email=${encodeURIComponent(payload.email)}`
          router.push(loginUrl)
          return
        }
        
        throw new Error(errorData.error || errorData.message || "Failed to create fundraiser")
      }

      const result = await response.json()
      router.push(`/fundraise/${result.slug}`)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to create fundraiser")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a Fundraiser</CardTitle>
        <CardDescription>Create your fundraising page for {campaignTitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit, (err) => {
            const firstError = Object.values(err)[0] as { message?: string } | undefined
            const message = firstError?.message ?? "Please fix the errors below."
            alert(message)
            const firstErrorEl = document.querySelector('[data-slot="card"] .text-destructive')
            firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" })
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Fundraiser Name *</Label>
            <Input
              id="title"
              value={watch("title") ?? ""}
              onChange={(e) => {
                hasUserEditedTitleRef.current = true
                setValue("title", e.target.value)
              }}
              placeholder={getFundraiserTitle()}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundraiserName">Your Name *</Label>
            <Input
              id="fundraiserName"
              transform="titleCase"
              placeholder="Your display name"
              {...register("fundraiserName")}
            />
            {errors.fundraiserName && (
              <p className="text-sm text-destructive">{errors.fundraiserName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Why are you fundraising? (Optional)</Label>
            <Textarea
              id="message"
              transform="titleCase"
              placeholder={getDefaultMessage()}
              rows={4}
              {...register("message")}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          {waterProjectId && (
            <>
              <div className="space-y-2">
                <Label>Choose Country *</Label>
                <div className="grid grid-cols-2 gap-2 w-full place-items-stretch">
                  {countries
                    .slice()
                    .sort((a, b) => a.pricePence - b.pricePence || a.country.localeCompare(b.country))
                    .map((country) => {
                      const isSelected = selectedCountryId === country.id
                      return (
                        <Button
                          key={country.id}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => setSelectedCountryId(country.id)}
                          className={[
                            "group w-full h-16 flex-col items-center justify-center px-3 py-2.5 text-center hover:!bg-primary hover:!text-primary-foreground hover:!border-primary",
                            isSelected && "shadow-sm",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <span className="text-sm font-medium leading-tight">
                            {country.country}
                          </span>
                          <span
                            className={[
                              "text-base font-semibold mt-0.5 leading-tight text-center group-hover:text-white",
                              isSelected ? "text-primary-foreground/90" : "text-foreground/80",
                            ].join(" ")}
                          >
                            {formatCurrency(country.pricePence)}
                          </span>
                        </Button>
                      )
                    })}
                </div>
                {!selectedCountryId && errors.targetAmountPence && (
                  <p className="text-sm text-destructive">Please choose a country to set your target.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">How many projects? *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => {
                    const nextValue = Math.max(1, Number(event.target.value || 1))
                    setQuantity(nextValue)
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Your target is calculated using the selected country price × quantity.
                </p>
              </div>
              {plaqueAvailable && (
                <div className="space-y-2">
                  <Label htmlFor="plaque-name">Name on Plaque *</Label>
                  <Input
                    id="plaque-name"
                    transform="titleCase"
                    value={plaqueName}
                    onChange={(e) => setPlaqueName(e.target.value)}
                    placeholder="Enter name to appear on plaque"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be displayed on the project plaque.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="targetAmountPence">Target Amount *</Label>
            {!waterProjectId && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {presetAmounts.map((amountPence) => (
                  <Button
                    key={amountPence}
                    type="button"
                    variant={isPresetSelected(amountPence) ? "default" : "outline"}
                    onClick={() => handlePresetClick(amountPence)}
                    className="h-11 text-base"
                  >
                    {formatCurrency(amountPence)}
                  </Button>
                ))}
              </div>
            )}
            <Input
              id="targetAmountPence"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("targetAmountPence")}
              disabled={Boolean(waterProjectId)}
              className={waterProjectId ? "bg-muted cursor-not-allowed" : undefined}
            />
            {errors.targetAmountPence && (
              <p className="text-sm text-destructive">{errors.targetAmountPence.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Fundraiser"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
