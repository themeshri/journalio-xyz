import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trade Journal | Journalio',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
