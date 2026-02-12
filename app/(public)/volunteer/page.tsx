import { VolunteerSignupForm } from "@/components/volunteer-signup-form"

export default function VolunteerPage() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:px-6">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Volunteer with us</h1>
        <p className="text-muted-foreground">
          Join our team of volunteers and help make a difference. Fill in your details below and we&apos;ll be in touch.
        </p>
      </div>
      <VolunteerSignupForm />
    </div>
  )
}
