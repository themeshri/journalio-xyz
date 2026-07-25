/**
 * Two-level navigation structure: a thin product rail plus a section sidebar.
 *
 * Phase C1 of the TradeZella refactor. Per docs §1, the split is what lets a
 * product add whole surfaces without crowding one flat list — Journalio's
 * single sidebar was already carrying 20+ links across five groups.
 *
 * This module is pure data so both ProductRail and AppSidebar read one source.
 */

import {
  Home,
  BookOpen,
  Clock,
  BarChart3,
  Puzzle,
  Wallet,
  Settings as SettingsIcon,
  Target,
  GitCompare,
  TrendingDown,
  ClipboardList,
  ClipboardCheck,
  SearchX,
  StickyNote,
  LayoutDashboard,
  Gauge,
  Swords,
  Brain,
  CalendarClock,
  CalendarDays,
  LineChart,
  Timer,
  type LucideIcon,
} from 'lucide-react'

export type ProductId = 'home' | 'journal' | 'analytics' | 'manage'

export interface NavItem {
  label: string
  href: string
  /** Required — every section entry renders an icon in both nav states. */
  icon: LucideIcon
  children?: { label: string; href: string }[]
  badge?: 'preSession' | 'discipline' | 'ruleScore'
  dataTour?: string
  /** Render a divider line after this item in the section menu. */
  dividerAfter?: boolean
}

export interface Product {
  id: ProductId
  label: string
  icon: LucideIcon
  /** Where the rail icon navigates to. */
  href: string
  /** Path prefixes that resolve to this product, longest-match-wins. */
  match: string[]
}

export const PRODUCTS: Product[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/', match: ['/'] },
  {
    id: 'journal',
    label: 'Journal',
    icon: BookOpen,
    href: '/trade-journal',
    match: ['/trade-journal', '/diary', '/missed-trades', '/progress-tracker', '/history'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/analytics',
    match: ['/analytics', '/chart-lab'],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: SettingsIcon,
    href: '/strategies',
    match: ['/strategies', '/wallet-management', '/settings'],
  },
]

export const PRODUCT_SECTIONS: Record<ProductId, NavItem[]> = {
  home: [{ label: 'Dashboard', href: '/', icon: Home }],

  journal: [
    {
      label: 'Pre-Session',
      href: '/diary/pre-session',
      icon: ClipboardList,
      badge: 'preSession',
    },
    {
      label: 'Trade Journal',
      href: '/trade-journal',
      icon: BookOpen,
      badge: 'discipline',
      dataTour: 'nav-journal',
    },
    {
      label: 'Missed Trades',
      href: '/missed-trades',
      icon: SearchX,
    },
    {
      label: 'Post-Session',
      href: '/diary/post-session',
      icon: ClipboardCheck,
    },
    {
      label: 'Notes',
      href: '/diary/notes',
      icon: StickyNote,
      dividerAfter: true,
    },
    {
      label: 'Journaling Progress',
      href: '/progress-tracker',
      icon: Target,
      badge: 'ruleScore',
    },
    {
      label: 'History',
      href: '/history',
      icon: Clock,
      children: [
        { label: 'Sessions', href: '/history?tab=pre-sessions' },
        { label: 'Journal', href: '/history?tab=journal' },
        { label: 'Transactions', href: '/history?tab=transactions' },
        { label: 'Missed Trades', href: '/history?tab=missed-trades' },
        { label: 'Attachments', href: '/history?tab=chartbook' },
      ],
    },
  ],

  analytics: [
    { label: 'Overview', href: '/analytics', icon: LayoutDashboard },
    { label: 'Time Analysis', href: '/analytics?tab=time', icon: Clock },
    { label: 'Discipline', href: '/analytics?tab=discipline', icon: Gauge },
    { label: 'Strategy', href: '/analytics?tab=strategy', icon: Swords },
    { label: 'Missed Trades', href: '/analytics?tab=missed', icon: SearchX },
    { label: 'Behavior', href: '/analytics?tab=behavior', icon: Brain },
    { label: 'Sessions', href: '/analytics?tab=sessions', icon: CalendarClock, dividerAfter: true },
    { label: 'Compare', href: '/analytics/compare', icon: GitCompare },
    { label: 'Drawdown', href: '/analytics/drawdown', icon: TrendingDown, dividerAfter: true },
    { label: 'Calendar', href: '/chart-lab/calendar', icon: CalendarDays },
    { label: 'Equity Curve', href: '/chart-lab/equity', icon: LineChart },
    { label: 'Distribution', href: '/chart-lab/distribution', icon: BarChart3 },
    { label: 'Holding Time', href: '/chart-lab/holding-time', icon: Timer },
  ],

  manage: [
    { label: 'Strategies', href: '/strategies', icon: Puzzle },
    { label: 'Wallets', href: '/wallet-management', icon: Wallet },
    { label: 'Settings', href: '/settings', icon: SettingsIcon },
  ],
}

/**
 * Resolve the active product from a pathname.
 *
 * Longest match wins so '/analytics/compare' resolves to analytics rather than
 * falling back. '/' matches home only exactly, since every path starts with it.
 */
export function productForPath(pathname: string): ProductId {
  let best: { id: ProductId; length: number } | null = null

  for (const product of PRODUCTS) {
    for (const prefix of product.match) {
      if (prefix === '/') {
        if (pathname === '/') return 'home'
        continue
      }
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        if (!best || prefix.length > best.length) {
          best = { id: product.id, length: prefix.length }
        }
      }
    }
  }

  return best?.id ?? 'home'
}
