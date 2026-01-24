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
  appealId: string
  appealTitle: string
}

export function FundraiserForm({ appealId, appealTitle }: FundraiserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const previousNameRef = React.useRef<string>("")

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
      title: appealTitle,
    },
  })

  // Ensure the title is always set to appeal title
  React.useEffect(() => {
    setValue("title", appealTitle)
  }, [appealTitle, setValue])

  const targetAmountPence = watch("targetAmountPence")
  const fundraiserName = watch("fundraiserName")
  const message = watch("message")
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
    if (fundraiserName) {
      return `${fundraiserName} is fundraising for ${appealTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
    }
    return `I am fundraising for ${appealTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
  }

  // Update message when fundraiser name changes (only if message is empty or matches default pattern)
  React.useEffect(() => {
    if (fundraiserName && fundraiserName !== previousNameRef.current) {
      previousNameRef.current = fundraiserName
      const currentMessage = message || ""
      // Only update if message is empty or matches the default pattern (contains "fundraising for")
      if (!currentMessage || (currentMessage.includes("fundraising for") && currentMessage.includes(appealTitle))) {
        const newMessage = `${fundraiserName} is fundraising for ${appealTitle} to make a meaningful impact and support those in need. Every contribution brings us closer to our goal and helps create positive change in our community.`
        setValue("message", newMessage, { shouldDirty: false })
      }
    }
  }, [fundraiserName, appealTitle, setValue, message])

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    const parsed = fundraiserSchema.parse(data)
    setLoading(true)
    try {
      const response = await fetch("/api/fundraisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed,
          appealId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // If email already exists, redirect to login
        if (errorData.requiresLogin) {
          // Get current path to redirect back to the same appeal page
          const currentPath = window.location.pathname
          const loginUrl = `/fundraise/login?redirect=${encodeURIComponent(currentPath)}&email=${encodeURIComponent(parsed.email)}`
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
        <CardDescription>Create your fundraising page for {appealTitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Fundraiser Name *</Label>
            <Input
              id="title"
              disabled
              className="bg-muted cursor-not-allowed"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fundraiserName">Your Name *</Label>
            <Input
              id="fundraiserName"
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
              placeholder={getDefaultMessage()}
              rows={4}
              {...register("message")}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmountPence">Target Amount *</Label>
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
            <Input
              id="targetAmountPence"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("targetAmountPence")}
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
