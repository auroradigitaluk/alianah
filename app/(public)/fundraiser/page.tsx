import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Heart, LogIn } from "lucide-react"
import { getFundraiserEmail } from "@/lib/fundraiser-auth"

export const dynamic = "force-dynamic"

export default async function FundraiserHubPage() {
  const email = await getFundraiserEmail()
  const isLoggedIn = Boolean(email)

  return (
    <div className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 md:px-6 max-w-lg flex flex-col justify-center items-center text-center">
      <div className="flex flex-col justify-center items-center text-center w-full max-w-md mx-auto px-4 py-12">
        <Image
          src="/logo-light.png"
          alt="Alianah"
          width={240}
          height={96}
          className="h-[4.8rem] sm:h-24 w-auto object-contain mb-8 dark:hidden"
          priority
        />
        <Image
          src="/logo-dark.png"
          alt="Alianah"
          width={240}
          height={96}
          className="h-[4.8rem] sm:h-24 w-auto object-contain mb-8 hidden dark:block"
          priority
        />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary px-3 py-1 text-sm font-medium w-fit mx-auto mb-6">
        <Heart className="size-4" />
        Fundraise
      </span>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
        Create or manage your fundraiser
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-10">
        Set up a campaign, share with friends, and help raise funds for causes you care about.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button
          asChild
          size="lg"
          className="rounded-full px-8 text-base font-semibold h-12 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Link href="/fundraiser/create">Create a fundraiser</Link>
        </Button>
        {!isLoggedIn && (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full px-8 text-base font-semibold h-12 border-primary/40 hover:bg-primary/10"
          >
            <Link href="/fundraiser/login" className="gap-2">
              <LogIn className="size-4" />
              Login
            </Link>
          </Button>
        )}
      </div>
      {!isLoggedIn && (
        <p className="text-xs text-muted-foreground mt-8 pt-4">
          Already have a campaign? Log in to manage it and view donations.
        </p>
      )}
      </div>
    </div>
  )
}
