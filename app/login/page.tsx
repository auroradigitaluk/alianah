"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/admin/dashboard"

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Too many attempts. Try again later.")
        return
      }

      if (!res.ok) {
        setError(data.error || "Invalid email or password")
        return
      }

      if (data.requiresTwoFactor) {
        router.push(
          `/login/otp?email=${encodeURIComponent(data.email)}&redirect=${encodeURIComponent(redirectTo)}`
        )
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
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
              <h1 className="text-2xl font-semibold">Assalamu Alaikum</h1>
              <p className="text-muted-foreground text-sm">
                Enter your credentials to access the admin panel
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-sm text-muted-foreground text-center">
                <Link href="/login/forgot-password" className="underline hover:text-foreground">
                  Forgot password?
                </Link>
              </p>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
      <div className="relative hidden min-h-svh lg:block">
        <Image
          src="/login image.webp"
          alt=""
          fill
          className="object-cover"
          sizes="50vw"
          priority
        />
      </div>
    </div>
  )
}
