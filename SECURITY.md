# Security Overview

Enterprise-level security measures implemented in this application.

## Authentication & Session

- **Signed session cookies** – HMAC-SHA256 signed; cannot be forged without `ADMIN_SESSION_SECRET`
- **`__Host-` cookie prefix** (production) – Binds cookie to host, requires HTTPS
- **SameSite=Strict** – Prevents CSRF via cross-site request forgery
- **7-day session expiry** – Balances security with usability
- **HttpOnly + Secure** – Cookies not accessible to JavaScript; HTTPS-only in production

## Password Policy

- **12+ characters** minimum
- **Uppercase, lowercase, number, and special character** required
- **bcrypt** with 12 rounds (cost factor)
- Applies to new passwords (invite/set-password flow); existing passwords unchanged

## Rate Limiting & Lockout

| Endpoint | Limit | Lockout |
|----------|-------|---------|
| Login | 5 attempts / 15 min (per IP + per email) | 30 min |
| OTP verify | 5 attempts / 5 min (per IP + per email) | 30 min |
| Set password | 5 attempts / 15 min (per IP) | 30 min |
| Verify invite | 5 attempts / 15 min (per IP) | 30 min |

## Security Headers

- **Strict-Transport-Security** – HSTS with 1-year max-age, includeSubDomains, preload
- **X-Frame-Options** – SAMEORIGIN (clickjacking protection)
- **X-Content-Type-Options** – nosniff (MIME sniffing protection)
- **X-XSS-Protection** – 1; mode=block
- **Referrer-Policy** – strict-origin-when-cross-origin
- **Permissions-Policy** – Restricts camera, microphone, geolocation

## API Protection

- All admin API routes require authentication
- Role-based access control (ADMIN, STAFF, VIEWER)
- Signed session verification on every request

## Production Checklist

1. Set `ADMIN_SESSION_SECRET` (or `NEXTAUTH_SECRET`) in Vercel
2. Ensure HTTPS is enforced (Vercel does this by default)
3. Use strong, unique passwords for all admin accounts
4. Enable 2FA for admin accounts (Settings → Security)
5. Regularly rotate `ADMIN_SESSION_SECRET` (invalidates all sessions)
