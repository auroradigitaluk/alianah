import { FundraiseFooter } from "@/components/fundraise-footer"
import { PublicGlowBg } from "@/components/public-glow-bg"
import { PublicHeaderWrapper } from "@/components/public-header-wrapper"
import { SidecartProvider } from "@/components/sidecart-provider"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidecartProvider>
      <PublicGlowBg>
        <div className="flex min-h-screen flex-col">
          <PublicHeaderWrapper />
          <main className="flex-1">{children}</main>
          <FundraiseFooter />
        </div>
      </PublicGlowBg>
    </SidecartProvider>
  )
}
