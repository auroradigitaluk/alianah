export type QurbaniDonationChannel = "website" | "offline" | "fundraiser"

/** Classify a qurbani row for admin display (website checkout vs office vs fundraiser page). */
export function getQurbaniDonationChannel(d: {
  fundraiserId: string | null
  collectedVia: string | null
  addedByAdminUserId: string | null
}): QurbaniDonationChannel {
  if (d.fundraiserId) return "fundraiser"
  if (d.collectedVia === "office" || d.addedByAdminUserId) return "offline"
  return "website"
}

const CHANNEL_LABEL: Record<QurbaniDonationChannel, string> = {
  website: "Website",
  offline: "Offline",
  fundraiser: "Fundraiser",
}

export function getQurbaniDonationChannelLabel(channel: QurbaniDonationChannel): string {
  return CHANNEL_LABEL[channel]
}
