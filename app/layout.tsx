import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import ErrorBoundary from '@/components/ErrorBoundary'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Journalio',
  description: 'Your Solana trading journal and wallet tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans`}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
