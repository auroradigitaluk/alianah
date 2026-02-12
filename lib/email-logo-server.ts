/**
 * Server-only: provides logo data URIs for embedding in emails.
 * Data is inlined at build time (scripts/inline-email-logos.js) so logos always load.
 * Only import this from server code (lib/email.ts) — never from client.
 */
import { LOGO_LIGHT_DATA_URI, LOGO_DARK_DATA_URI } from "./email-logo-data.generated"

export function getLogoDataUris(): { light: string; dark: string } {
  return { light: LOGO_LIGHT_DATA_URI, dark: LOGO_DARK_DATA_URI }
}
