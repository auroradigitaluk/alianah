import { redirect } from "next/navigation"

/** Redirect to the shared fundraiser login; forwards redirect and email from query. */
export default async function FundraiserLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; email?: string }>
}) {
  const params = await searchParams
  const redirectTo = params.redirect || "/fundraiser/dashboard"
  const email = params.email || ""
  const q = new URLSearchParams({ redirect: redirectTo })
  if (email) q.set("email", email)
  redirect(`/fundraise/login?${q.toString()}`)
}
