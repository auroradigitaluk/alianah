import { FundraiseFooter } from "@/components/fundraise-footer"
import { PublicGlowBg } from "@/components/public-glow-bg"
import { PublicHeader } from "@/components/public-header"
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
          <PublicHeader />
          <main className="flex-1">{children}</main>
          <FundraiseFooter />
        </div>
      </PublicGlowBg>
    </SidecartProvider>
  )
}
