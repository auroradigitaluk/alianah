"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export function FundraisingSlideshow({
  images,
  alt,
  intervalMs = 4500,
  className,
}: {
  images: string[]
  alt: string
  intervalMs?: number
  className?: string
}) {
  const safeImages = React.useMemo(() => images.filter(Boolean), [images])
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (safeImages.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % safeImages.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, safeImages.length])

  React.useEffect(() => {
    if (index >= safeImages.length) setIndex(0)
  }, [index, safeImages.length])

  if (safeImages.length === 0) return null

  return (
    <div className={cn("relative w-full aspect-video rounded-lg overflow-hidden bg-muted border", className)}>
      {safeImages.map((src, i) => (
        <Image
          key={`${src}-${i}`}
          src={src}
          alt={alt}
          fill
          className={cn(
            "object-cover transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0"
          )}
          sizes="(max-width: 768px) 100vw, 900px"
          priority={i === index}
        />
      ))}

      {safeImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-full">
          {safeImages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show image ${i + 1}`}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === index ? "bg-white" : "bg-white/50 hover:bg-white/70"
              )}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

