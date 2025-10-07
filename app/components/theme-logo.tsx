"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeLogo() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return logo by default to avoid hydration mismatch
    return (
      <img
        src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg_GTddjshs6-uvgHq3d6NI1EmH6S6yC8q3q9qph4Zt1bp99cutsiuoxU536bYww37tnD2BM8V9hZuAMo_dAbm0aB1GACg3-k36MjHGkJE0zz5Q-iiky1UOE6YMV5F63fgjgUyoypHVp5DPkROskkEKBJP-Dw3CR4D-VAvOZtlVkcsh92ttj2PQHNxOk2y3/s554/download.jpeg"
        alt="Lade Coder"
        className="h-8 w-auto"
      />
    )
  }

  return (
    <img
      src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg_GTddjshs6-uvgHq3d6NI1EmH6S6yC8q3q9qph4Zt1bp99cutsiuoxU536bYww37tnD2BM8V9hZuAMo_dAbm0aB1GACg3-k36MjHGkJE0zz5Q-iiky1UOE6YMV5F63fgjgUyoypHVp5DPkROskkEKBJP-Dw3CR4D-VAvOZtlVkcsh92ttj2PQHNxOk2y3/s554/download.jpeg"
      alt="Lade Coder"
      className="h-8 w-auto"
    />
  )
}
