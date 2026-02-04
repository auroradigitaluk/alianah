"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type MeUser = { id: string; email: string; role: string; twoFactorEnabled: boolean }

export function SecurityTab() {
  const [user, setUser] = React.useState<MeUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [step, setStep] = React.useState<"idle" | "qr" | "verify">("idle")
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null)
  const [code, setCode] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const handleStart2FA = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/auth/otp/setup", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start")
      setQrDataUrl(data.qrDataUrl)
      setStep("qr")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start 2FA")
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/auth/otp/setup/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Invalid code")
      setStep("idle")
      setCode("")
      setQrDataUrl(null)
      setUser((u) => (u ? { ...u, twoFactorEnabled: true } : null))
      toast.success("2FA enabled")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code")
    } finally {
      setSaving(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm("Disable two-factor authentication? Your account will be less secure.")) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/auth/otp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Failed to disable")
      setUser((u) => (u ? { ...u, twoFactorEnabled: false } : null))
      toast.success("2FA disabled")
    } catch (err) {
      toast.error("Failed to disable 2FA")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel2FA = () => {
    setStep("idle")
    setQrDataUrl(null)
    setCode("")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Security</CardTitle>
        <p className="text-xs text-muted-foreground">
          Two-factor authentication adds an extra layer of security to your account.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {user?.twoFactorEnabled ? (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="text-sm text-muted-foreground">Your account is protected with 2FA</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable2FA}
              disabled={saving}
            >
              Disable 2FA
            </Button>
          </div>
        ) : step === "qr" ? (
          <form onSubmit={handleConfirm2FA} className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Scan with your authenticator app</p>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="2FA QR code"
                  className="w-48 h-48 border rounded-lg"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="totp-code">Enter the 6-digit code</Label>
              <Input
                id="totp-code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-xl tracking-widest w-32"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving || code.length !== 6}>
                {saving ? "Verifying…" : "Enable 2FA"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel2FA}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="text-sm text-muted-foreground">Protect your account with an authenticator app</p>
            </div>
            <Button onClick={handleStart2FA} disabled={saving}>
              Enable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
