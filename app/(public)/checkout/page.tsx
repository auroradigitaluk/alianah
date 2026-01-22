"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useSidecart } from "@/components/sidecart-provider"
import { formatCurrency } from "@/lib/utils"
import { z } from "zod"

const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  marketingEmail: z.boolean().default(false),
  marketingSMS: z.boolean().default(false),
  giftAid: z.boolean().default(false),
  coverFees: z.boolean().default(false),
})

export default function CheckoutPage() {
  const router = useRouter()
  const { items, clearCart } = useSidecart()
  const [loading, setLoading] = React.useState(false)
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postcode: "",
    country: "",
    marketingEmail: false,
    marketingSMS: false,
    giftAid: false,
    coverFees: false,
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const subtotalPence = items.reduce((sum, item) => sum + item.amountPence, 0)
  const feesPence = formData.coverFees ? Math.round(subtotalPence * 0.02) + 20 : 0
  const totalPence = subtotalPence + feesPence

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const validated = checkoutSchema.parse(formData)
      
      setLoading(true)

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          donor: validated,
          subtotalPence,
          feesPence,
          totalPence,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create order")
      }

      const { orderId } = await response.json()
      clearCart()
      router.push(`/success/${orderId}`)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        alert("An error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:px-6">
        <Card>
          <CardContent className="p-6 sm:p-12 text-center">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Your basket is empty</h2>
            <Button asChild>
              <Link href="/">Browse Appeals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 md:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-5">
          {/* Donor Details - Left Side (Desktop) - 60% */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6 order-1 lg:order-1">
            <Card>
              <CardHeader>
                <CardTitle>Donor Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Marketing Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketingEmail"
                    checked={formData.marketingEmail}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, marketingEmail: checked === true })
                    }
                  />
                  <Label htmlFor="marketingEmail" className="font-normal cursor-pointer">
                    I would like to receive email updates about appeals and campaigns
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketingSMS"
                    checked={formData.marketingSMS}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, marketingSMS: checked === true })
                    }
                  />
                  <Label htmlFor="marketingSMS" className="font-normal cursor-pointer">
                    I would like to receive SMS updates (if phone number provided)
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gift Aid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-base mb-1">
                      Boost your donation by 25% at no extra cost to you
                    </p>
                    <p className="text-sm text-muted-foreground">
                      If you're a UK taxpayer, you can claim Gift Aid. The government will add 25% to your donation - you don't need to pay anything extra!
                    </p>
                  </div>
                  <div className="bg-background border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your donation:</span>
                      <span className="font-medium">{formatCurrency(totalPence)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Government top-up (25%):</span>
                      <span className={`font-medium ${formData.giftAid ? 'text-primary' : 'text-muted-foreground'}`}>
                        +{formatCurrency(Math.round(totalPence * 0.25))}
                      </span>
                    </div>
                    <div className="pt-2 border-t flex justify-between font-semibold">
                      <span>Total we receive:</span>
                      <span className={formData.giftAid ? 'text-green-600' : 'text-muted-foreground'}>
                        {formatCurrency(Math.round(totalPence * 1.25))}
                      </span>
                    </div>
                    {!formData.giftAid && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Check the box below to claim Gift Aid
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="giftAid"
                    checked={formData.giftAid}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, giftAid: checked === true })
                    }
                  />
                  <Label htmlFor="giftAid" className="font-normal cursor-pointer">
                    I am a UK taxpayer and would like to claim Gift Aid
                  </Label>
                </div>
                {formData.giftAid && (
                  <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                    <p className="mb-2">
                      I confirm I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.
                    </p>
                    <p>
                      Please notify us if you want to cancel this declaration, change your name or home address, or no longer pay sufficient tax on your income and/or capital gains.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="coverFees"
                    checked={formData.coverFees}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, coverFees: checked === true })
                    }
                  />
                  <Label htmlFor="coverFees" className="font-normal cursor-pointer">
                    Cover processing fees
                  </Label>
                </div>
                {formData.coverFees && feesPence > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Processing fees: {formatCurrency(feesPence)} (2% + £0.20)
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary - Right Side (Desktop) - 40% - Sticky */}
          <div className="lg:sticky lg:top-20 lg:h-fit order-2 lg:order-2 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.appealTitle}</p>
                        {item.productName && (
                          <p className="text-muted-foreground">{item.productName}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.amountPence)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotalPence)}</span>
                  </div>
                  {feesPence > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Fees</span>
                      <span>{formatCurrency(feesPence)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totalPence)}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Processing..." : "Complete Donation"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
