'use client'

import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'motion/react'
import { spring } from '@/lib/motion'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        {/* reducedMotion="user" honors the OS "Reduce motion" setting app-wide,
            and sets one shared spring transition for inheriting components. */}
        <MotionConfig reducedMotion="user" transition={spring}>
          {children}
        </MotionConfig>
      </ThemeProvider>
    </SupabaseProvider>
  )
}
