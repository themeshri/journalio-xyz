'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Home,
  BookOpen,
  BookHeart,
  Clock,
  BarChart3,
  Puzzle,
  Wallet,
  Settings as SettingsIcon,
  ChevronRight,
  Menu,
  Moon,
  Sun,
  PanelLeftClose,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { useWallet, useMetadata, makeWalletKey } from '@/lib/wallet-context'
import { CHAIN_CONFIG, type Chain } from '@/lib/chains'
import { computeTradeDiscipline, disciplineColor, type DisciplineResult } from '@/lib/discipline'
import type { JournalData } from '@/components/JournalModal'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  children?: { label: string; href: string }[]
  badge?: 'preSession' | 'discipline'
}

const mainNav: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Journal', href: '/trade-journal', icon: BookOpen, badge: 'discipline' },
  {
    label: 'Session Diary',
    href: '/diary',
    icon: BookHeart,
    badge: 'preSession',
    children: [
      { label: 'Pre-Session', href: '/diary/pre-session' },
      { label: 'Post-Session', href: '/diary/post-session' },
      { label: 'Missed Trades', href: '/missed-trades' },
      { label: 'Notes', href: '/diary/notes' },
    ],
  },
  {
    label: 'Analytics',
    href: '/chart-lab',
    icon: BarChart3,
    children: [
      { label: 'Overview', href: '/analytics' },
      { label: 'Calendar', href: '/chart-lab/calendar' },
      { label: 'Equity Curve', href: '/chart-lab/equity' },
      { label: 'Distribution', href: '/chart-lab/distribution' },
      { label: 'Holding Time', href: '/chart-lab/holding-time' },
    ],
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
]

const managementNav: NavItem[] = [
  { label: 'Strategies', href: '/strategies', icon: Puzzle },
  { label: 'Wallets', href: '/wallet-management', icon: Wallet },
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state, setOpen, toggleSidebar } = useSidebar()
  const { activeWallets, walletSlots, streak, tradeComments, journalMap } = useWallet()
  const { preSessionDone } = useMetadata()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  const [disciplineDotColor, setDisciplineDotColor] = useState<'gold' | 'yellow' | 'red' | null>(null)

  // Compute discipline from journal map (from context)
  useEffect(() => {
    if (tradeComments.length === 0 || Object.keys(journalMap).length === 0) {
      setDisciplineDotColor(null)
      return
    }

    const journalsWithTime: { data: JournalData; time: string }[] = []
    for (const [, data] of Object.entries(journalMap)) {
      if (data?.entryCommentId || data?.exitCommentId || data?.managementCommentId) {
        journalsWithTime.push({ data, time: data.journaledAt || '' })
      }
    }

    if (journalsWithTime.length === 0) {
      setDisciplineDotColor(null)
      return
    }

    journalsWithTime.sort((a, b) => b.time.localeCompare(a.time))
    const recent = journalsWithTime.slice(0, 5)

    const results = recent
      .map((j) => computeTradeDiscipline(j.data, tradeComments))
      .filter((r): r is DisciplineResult => r !== null)

    if (results.length === 0) {
      setDisciplineDotColor(null)
      return
    }

    const avg = results.reduce((sum, r) => sum + r.percentage, 0) / results.length
    setDisciplineDotColor(disciplineColor(avg))
  }, [tradeComments, journalMap])

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    // For query-param sub-tabs like /history?tab=journal
    if (href.includes('?')) {
      const [path, query] = href.split('?')
      if (!pathname.startsWith(path)) return false
      const params = new URLSearchParams(query)
      const tab = params.get('tab')
      return tab ? searchParams.get('tab') === tab : true
    }
    return pathname.startsWith(href)
  }

  function isParentActive(item: NavItem): boolean {
    if (isActive(item.href)) return true
    if (item.children) {
      return item.children.some((child) => isActive(child.href))
    }
    return false
  }

  function truncate(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  function renderBadge(badge?: 'preSession' | 'discipline') {
    if (badge === 'preSession') {
      return (
        <span
          className={`ml-auto inline-block h-2 w-2 rounded-full shrink-0 ${
            preSessionDone ? 'bg-amber-500' : 'bg-zinc-400'
          }`}
          title={preSessionDone ? 'Completed today' : 'Not completed today'}
        />
      )
    }
    if (badge === 'discipline' && disciplineDotColor) {
      return (
        <span
          className={`ml-auto inline-block h-2 w-2 rounded-full shrink-0 ${
            disciplineDotColor === 'gold' ? 'bg-amber-500' : disciplineDotColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          title={`Rolling discipline: ${disciplineDotColor}`}
        />
      )
    }
    return null
  }

  function handleParentClick(item: NavItem) {
    if (state === 'collapsed') {
      setOpen(true)
    }
  }

  function renderNavItem(item: NavItem) {
    if (!item.children) {
      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={isActive(item.href)}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
              {renderBadge(item.badge)}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    }

    const parentActive = isParentActive(item)

    return (
      <Collapsible
        key={item.href}
        asChild
        defaultOpen={parentActive}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={item.label}
              isActive={parentActive}
              onClick={() => handleParentClick(item)}
            >
              <item.icon />
              <span>{item.label}</span>
              {renderBadge(item.badge)}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActive(child.href)}
                  >
                    <Link href={child.href}>
                      <span>{child.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  function renderWalletSummary() {
    if (activeWallets.length === 0) {
      return (
        <Link
          href="/wallet-management"
          className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          No wallets active
        </Link>
      )
    }

    if (activeWallets.length === 1) {
      const w = activeWallets[0]
      const key = makeWalletKey(w.address, w.chain)
      const slot = walletSlots[key]
      return (
        <Link
          href="/wallet-management"
          className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
          title={w.nickname || w.address}
        >
          <span className="text-[10px] font-medium bg-muted px-1 py-0.5 rounded shrink-0">
            {CHAIN_CONFIG[w.chain].label.toUpperCase()}
          </span>
          <span className="font-mono truncate">
            {w.nickname || truncate(w.address)}
          </span>
          {slot?.isLoading && (
            <span className="ml-auto text-[10px] text-muted-foreground animate-pulse">loading</span>
          )}
        </Link>
      )
    }

    const chainBadges = [...new Set(activeWallets.map((w) => w.chain))]
    return (
      <Link
        href="/wallet-management"
        className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {chainBadges.map((chain) => (
          <span key={chain} className="text-[10px] font-medium bg-muted px-1 py-0.5 rounded shrink-0">
            {CHAIN_CONFIG[chain].label.toUpperCase()}
          </span>
        ))}
        <span>{activeWallets.length} wallets active</span>
      </Link>
    )
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="text-base font-heading font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Journalio
          </div>
          <button
            onClick={() => toggleSidebar()}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 transition-colors"
            title="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          {renderWalletSummary()}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {mainNav.map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarMenu>
            {managementNav.map(renderNavItem)}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter className="px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={isDark ? 'Use Light Mode' : 'Use Dark Mode'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun /> : <Moon />}
              <span>{isDark ? 'Use Light Mode' : 'Use Dark Mode'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Collapse Sidebar"
              onClick={() => toggleSidebar()}
            >
              <PanelLeftClose />
              <span>Collapse Sidebar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
