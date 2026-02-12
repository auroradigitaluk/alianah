"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Too many attempts. Try again later.")
        return
      }

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }

      setSent(true)
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <Image
                src="/logo-light.png"
                alt="Logo"
                width={48}
                height={48}
                className="dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt="Logo"
                width={48}
                height={48}
                className="hidden dark:block"
              />
              <span>Alianah Humanity Welfare</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs space-y-6">
              <div>
                <h1 className="text-2xl font-semibold">Check your email</h1>
                <p className="text-muted-foreground text-sm mt-2">
                  If an account exists with that email, we&apos;ve sent a password reset link. It may take a few minutes to arrive. Check your spam folder if you don&apos;t see it.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Back to sign in</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logo-light.png"
              alt=""
              width={120}
              height={120}
              className="opacity-20 dark:hidden"
            />
            <Image
              src="/logo-dark.png"
              alt=""
              width={120}
              height={120}
              className="hidden opacity-20 dark:block"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/logo-light.png"
              alt="Logo"
              width={48}
              height={48}
              className="dark:hidden"
            />
            <Image
              src="/logo-dark.png"
              alt="Logo"
              width={48}
              height={48}
              className="hidden dark:block"
            />
            <span>Alianah Humanity Welfare</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Forgot password?</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Enter your admin email and we&apos;ll send you a link to reset your password.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline hover:text-foreground">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/logo-light.png"
            alt=""
            width={120}
            height={120}
            className="opacity-20 dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt=""
            width={120}
            height={120}
            className="hidden opacity-20 dark:block"
          />
        </div>
      </div>
    </div>
  )
}
