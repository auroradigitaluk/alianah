import * as React from "react"

type Props = React.SVGProps<SVGSVGElement>

export function WaterPumpIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 20h16" />
      <path d="M7 20v-7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v7" />
      <path d="M10 10V6a2 2 0 0 1 2-2h2" />
      <path d="M14 4h4" />
      <path d="M18 4v3" />
      <path d="M15 14h3" />
      <path d="M18 14c0 2-1 3-3 3" />
      <path d="M12 16v4" />
    </svg>
  )
}

export function WaterWellIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 20h12" />
      <path d="M7 20v-6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v6" />
      <path d="M8 11l4-5 4 5" />
      <path d="M10 6h4" />
      <path d="M12 11v9" />
      <path d="M16 14h2" />
      <path d="M18 14v3" />
    </svg>
  )
}

export function WaterTankIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M7 6c0-1.7 2.2-3 5-3s5 1.3 5 3-2.2 3-5 3-5-1.3-5-3Z" />
      <path d="M7 6v12c0 1.7 2.2 3 5 3s5-1.3 5-3V6" />
      <path d="M9 12h6" />
      <path d="M12 9v-1" />
    </svg>
  )
}

export function WudhuHandsIcon(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M7 13v-2a2 2 0 0 1 2-2h1" />
      <path d="M10 9v6" />
      <path d="M14 9v6" />
      <path d="M17 13v-2a2 2 0 0 0-2-2h-1" />
      <path d="M8 15c1.2 1.2 2.6 2 4 2s2.8-.8 4-2" />
      <path d="M9 20h6" />
      <path d="M12 4c1.5 0 2.5 1 2.5 2.2S13.5 8.5 12 8.5 9.5 7.5 9.5 6.2 10.5 4 12 4Z" />
    </svg>
  )
}

