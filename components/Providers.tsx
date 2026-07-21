'use client'

import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { ThemeProvider } from 'next-themes'
import { HeroUIProvider } from '@heroui/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {/* HeroUI provider (pilot). Reads dark mode from the same `class`
            strategy next-themes sets on <html>. */}
        <HeroUIProvider>
          {children}
        </HeroUIProvider>
      </ThemeProvider>
    </SupabaseProvider>
  )
}
