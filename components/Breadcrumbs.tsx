'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  '': 'Overview',
  'diary': 'Diary',
  'pre-session': 'Pre-Session',
  'post-session': 'Post-Session',
  'notes': 'Notes',
  'trade-journal': 'Trade Journal',
  'history': 'History',
  'chart-lab': 'Chart Lab',
  'calendar': 'Calendar',
  'distribution': 'Distribution',
  'equity': 'Equity',
  'holding-time': 'Holding Time',
  'analytics': 'Analytics',
  'missed-trades': 'Missed Trades',
  'strategies': 'Strategies',
  'wallet-management': 'Wallets',
  'settings': 'Settings',
}

export function Breadcrumbs() {
  const pathname = usePathname()

  // Don't show breadcrumbs on the overview page
  if (pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)

  // Only show for nested routes (2+ segments)
  if (segments.length < 2) return null

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = ROUTE_LABELS[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const isLast = index === segments.length - 1
    return { href, label, isLast }
  })

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
      <Link href="/" className="hover:text-foreground transition-colors">
        Overview
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
