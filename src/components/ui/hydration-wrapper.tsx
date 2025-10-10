"use client"

import { useState, useEffect } from 'react'

interface HydrationWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Wrapper para evitar problemas de hidratação em componentes
 * que podem ter diferenças entre servidor e cliente
 */
export function HydrationWrapper({ children, fallback }: HydrationWrapperProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return fallback ? <>{fallback}</> : null
  }

  return <>{children}</>
}