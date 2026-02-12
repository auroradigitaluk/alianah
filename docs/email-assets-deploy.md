# Email logo (public folder)

Transactional emails use a logo that **must** be served from a public HTTPS URL. Email clients cannot load local file paths or relative URLs.

The logo files are in the app’s **public** folder:

- `public/logo-light.png`
- `public/logo-dark.png`

When the app is deployed at **https://give.alianah.org**, Next.js serves them at:

- `https://give.alianah.org/logo-light.png`
- `https://give.alianah.org/logo-dark.png`

No separate upload is required. Email templates in `lib/email-templates.ts` use `https://give.alianah.org/logo-light.png` for the logo.
