"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface ShareButtonProps {
  appealTitle: string
}

export function ShareButton({ appealTitle }: ShareButtonProps) {
  const router = useRouter()

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: appealTitle,
        text: "I just made a donation to support this appeal",
        url: window.location.origin,
      }).catch(() => {
        // Share failed, do nothing
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.origin).then(() => {
        alert("Link copied to clipboard!")
      })
    }
  }

  return (
    <Button variant="outline" className="flex-1" onClick={handleShare}>
      Share This Appeal
    </Button>
  )
}
