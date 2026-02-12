"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function capitalizeWords(value: string): string {
  return value
    .split(/(\s+)/)
    .map((part) =>
      /^\s+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("")
}

export function VolunteerSignupForm() {
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [city, setCity] = React.useState("")
  const [dateOfBirth, setDateOfBirth] = React.useState("")
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("submitting")
    setErrorMessage(null)
    try {
      const res = await fetch("/api/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          dateOfBirth: dateOfBirth.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error ?? "Something went wrong. Please try again.")
        return
      }
      setStatus("success")
      setFirstName("")
      setLastName("")
      setEmail("")
      setPhone("")
      setCity("")
      setDateOfBirth("")
    } catch {
      setStatus("error")
      setErrorMessage("Something went wrong. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Thank you</CardTitle>
          <CardDescription>
            Your volunteer sign-up has been received. We&apos;ll be in touch soon.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Volunteer with us</CardTitle>
        <CardDescription>
          Sign up to volunteer with Alianah Humanity Welfare. We&apos;ll use your details to get in touch about opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vol-firstName">First name *</Label>
              <Input
                id="vol-firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(capitalizeWords(e.target.value))}
                disabled={status === "submitting"}
                placeholder="e.g. Ahmed"
                autoCapitalize="words"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vol-lastName">Last name *</Label>
              <Input
                id="vol-lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(capitalizeWords(e.target.value))}
                disabled={status === "submitting"}
                placeholder="e.g. Khan"
                autoCapitalize="words"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-email">Email *</Label>
            <Input
              id="vol-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting"}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-phone">Phone *</Label>
            <Input
              id="vol-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={status === "submitting"}
              placeholder="e.g. 07123 456 789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-city">City *</Label>
            <Input
              id="vol-city"
              type="text"
              required
              value={city}
              onChange={(e) => setCity(capitalizeWords(e.target.value))}
              disabled={status === "submitting"}
              placeholder="e.g. London"
              autoCapitalize="words"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vol-dob">Date of birth *</Label>
            <Input
              id="vol-dob"
              type="date"
              required
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={status === "submitting"}
            />
          </div>
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button type="submit" className="w-full" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting…" : "Sign up as volunteer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
