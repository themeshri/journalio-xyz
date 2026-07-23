import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Progress Tracker | Journalio',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
