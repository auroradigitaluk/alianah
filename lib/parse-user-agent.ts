/**
 * Lightweight User-Agent parsing for analytics.
 * Extracts device type, OS, and browser from UA string.
 */
export function parseUserAgent(ua: string | null): {
  deviceType: string
  osName: string
  clientName: string
} {
  const u = ua ?? ""
  let deviceType = "desktop"
  let osName = "Unknown"
  let clientName = "Unknown"

  // Device type
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(u)) {
    deviceType = "mobile"
  } else if (/tablet|ipad|playbook|silk/i.test(u)) {
    deviceType = "tablet"
  }

  // OS
  if (/windows nt 10/i.test(u)) osName = "Windows"
  else if (/windows nt 11/i.test(u)) osName = "Windows 11"
  else if (/windows/i.test(u)) osName = "Windows"
  else if (/mac os x|macintosh/i.test(u)) osName = "macOS"
  else if (/iphone os|ipad/i.test(u)) osName = "iOS"
  else if (/android/i.test(u)) osName = "Android"
  else if (/cros/i.test(u)) osName = "Chrome OS"
  else if (/linux/i.test(u)) osName = "Linux"

  // Browser
  if (/edg\//i.test(u)) clientName = "Edge"
  else if (/opr\//i.test(u) || /opera/i.test(u)) clientName = "Opera"
  else if (/chrome/i.test(u) && !/edg/i.test(u)) clientName = "Chrome"
  else if (/safari/i.test(u) && !/chrome/i.test(u)) clientName = "Safari"
  else if (/firefox/i.test(u)) clientName = "Firefox"
  else if (/msie|trident/i.test(u)) clientName = "Internet Explorer"

  return { deviceType, osName, clientName }
}
