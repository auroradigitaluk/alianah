"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [email, setEmail] = React.useState<string | null>(null)
  const [tokenType, setTokenType] = React.useState<"invite" | "reset" | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetch(`/api/admin/auth/verify-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setEmail(data.email)
          setTokenType(data.type === "reset" ? "reset" : "invite")
        } else {
          setEmail(null)
          setTokenType(null)
        }
      })
      .catch(() => {
        setEmail(null)
        setTokenType(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 12) {
      setError("Password must be at least 12 characters")
      return
    }
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/.test(
        password
      )
    ) {
      setError("Password must contain uppercase, lowercase, number, and special character")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to set password")
        return
      }

      router.push("/admin/dashboard")
      router.refresh()
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!token || !email) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">Invalid or expired link</h1>
        <p className="text-muted-foreground text-center text-sm">
          This link may have expired or is invalid. You can request a new password reset from the sign-in page, or ask an admin to send you a new invite.
        </p>
        <Button asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  const isReset = tokenType === "reset"
  const title = isReset ? "Reset your password" : "Set your password"
  const description = isReset
    ? `Choose a new password for ${email}. Use at least 12 characters with uppercase, lowercase, number, and special character.`
    : `Create a password for ${email}. Use at least 12 characters with uppercase, lowercase, number, and special character.`
  const submitLabel = isReset ? "Reset password and sign in" : "Set password and sign in"

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
              <h1 className="text-2xl font-semibold">{title}</h1>
              <p className="text-muted-foreground text-sm">
                {description}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={saving}
                  minLength={12}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={saving}
                  minLength={12}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting password...
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </form>
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
