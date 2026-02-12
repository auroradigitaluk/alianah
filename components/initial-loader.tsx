"use client"

import Image from "next/image"

export function InitialLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="relative h-40 w-[36rem]">
          <Image
            src="/logo-light.png"
            alt="Alianah Humanity Welfare"
            fill
            priority
            className="object-contain dark:hidden"
          />
          <Image
            src="/logo-dark.png"
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
          <div
            className="h-full bg-primary motion-reduce:animate-none motion-reduce:w-full"
            style={{ animation: "initial-loader-progress 1.6s ease-out forwards" }}
          />
        </div>
      </div>
      <style jsx>{`
        @keyframes initial-loader-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
