# Email assets deployment

Transactional emails (donation confirmation, refunds, recurring, Gift Aid, etc.) use a logo that **must** be served from a public HTTPS URL. Email clients (Gmail, Outlook, Apple Mail) cannot load local file paths or relative URLs.

## Required URLs

- `https://alianah.org/email-assets/logo-light.png`
- `https://alianah.org/email-assets/logo-dark.png` (for future use if needed)

## Deploy steps

1. On the **production** server, ensure the directory exists:
   - `/public_html/email-assets/`

2. Upload both logo files from this repo into that directory:
   - `public/logo-light.png` → `/public_html/email-assets/logo-light.png`
   - `public/logo-dark.png` → `/public_html/email-assets/logo-dark.png`

3. Confirm the images are publicly accessible over HTTPS:
   - Open https://alianah.org/email-assets/logo-light.png in a browser (should show the logo, not 404).

All email templates in `lib/email-templates.ts` use the absolute URL `https://alianah.org/email-assets/logo-light.png` for the logo; no code changes are needed after upload.
