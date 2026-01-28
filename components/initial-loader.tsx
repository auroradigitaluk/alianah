import Image from "next/image"

export function InitialLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="relative h-40 w-[36rem]">
          <Image
            src="/logo%20light.png"
            alt="Alianah Humanity Welfare"
            fill
            priority
            className="object-contain dark:hidden"
          />
          <Image
            src="/logo%20dark.png"
            alt="Alianah Humanity Welfare"
            fill
            priority
            className="object-contain hidden dark:block"
          />
        </div>
        <p className="text-sm font-medium text-center text-black dark:text-white">
          Assisting those in need.
        </p>
        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/3 bg-primary animate-pulse" />
        </div>
      </div>
    </div>
  )
}
