import { FundraiseThemeLight } from "@/components/fundraise-theme-light"

export default function FundraiseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <FundraiseThemeLight>{children}</FundraiseThemeLight>
}
