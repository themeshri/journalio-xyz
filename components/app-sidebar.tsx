'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { useWallet, makeWalletKey } from '@/lib/wallet-context'
import { CHAIN_CONFIG, type Chain } from '@/lib/chains'
import { computeTradeDiscipline, disciplineColor, type DisciplineResult } from '@/lib/discipline'
import type { JournalData } from '@/components/JournalModal'

const primaryNav = [
  { label: 'Overview', href: '/' },
  { label: 'Pre Session', href: '/pre-session' },
  { label: 'Trade Journal', href: '/trade-journal' },
  { label: 'History', href: '/history' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Missed Trades', href: '/missed-trades' },
]

const managementNav = [
  { label: 'Strategies', href: '/strategies' },
  { label: 'Wallet Management', href: '/wallet-management' },
  { label: 'Settings', href: '/settings' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { activeWallets, savedWallets, setWalletActive, walletSlots, streak, tradeComments, journalMap } = useWallet()
  const [preSessionDone, setPreSessionDone] = useState(false)
  const [walletsExpanded, setWalletsExpanded] = useState(false)
  const [disciplineDotColor, setDisciplineDotColor] = useState<'emerald' | 'yellow' | 'red' | null>(null)

  // Check pre-session status via API
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    fetch(`/api/pre-sessions/${today}`)
      .then((r) => r.json())
      .then((data) => {
        setPreSessionDone(data !== null && data?.savedAt)
      })
      .catch(() => setPreSessionDone(false))
  }, [])

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
    return pathname.startsWith(href)
  }

  function isWalletActive(address: string, chain: Chain): boolean {
    return activeWallets.some((w) => w.address === address && w.chain === chain)
  }

  function truncate(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  function renderNavGroup(items: { label: string; href: string }[]) {
    return (
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive(item.href)}
              className="text-sm"
            >
              <Link href={item.href}>
                {item.label}
                {item.href === '/pre-session' && (
                  <span
                    className={`ml-auto inline-block h-2 w-2 rounded-full ${
                      preSessionDone ? 'bg-emerald-500' : 'bg-zinc-400'
                    }`}
                    title={preSessionDone ? 'Completed today' : 'Not completed today'}
                  />
                )}
                {item.href === '/trade-journal' && disciplineDotColor && (
                  <span
                    className={`ml-auto inline-block h-2 w-2 rounded-full ${
                      disciplineDotColor === 'emerald' ? 'bg-emerald-500' : disciplineDotColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    title={`Rolling discipline: ${disciplineDotColor}`}
                  />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    )
  }

  // Active wallet summary for header
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

    // 2+ wallets
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
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <div className="text-base font-semibold tracking-tight">
          Journalio
        </div>
        {renderWalletSummary()}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {renderNavGroup(primaryNav)}
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          {renderNavGroup(managementNav)}
        </SidebarGroup>

        {/* Wallet toggles */}
        {savedWallets.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel
                className="cursor-pointer select-none"
                onClick={() => setWalletsExpanded(!walletsExpanded)}
              >
                Wallets {walletsExpanded ? '−' : '+'}
              </SidebarGroupLabel>
              {walletsExpanded && (
                <div className="px-2 space-y-1">
                  {savedWallets.map((w) => {
                    const active = isWalletActive(w.address, w.chain)
                    const key = makeWalletKey(w.address, w.chain)
                    const slot = walletSlots[key]
                    return (
                      <label
                        key={`${w.chain}-${w.address}`}
                        className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => setWalletActive(w.address, w.chain, e.target.checked)}
                          className="rounded border-border"
                        />
                        <span className="text-[10px] font-medium bg-muted px-1 py-0.5 rounded shrink-0">
                          {CHAIN_CONFIG[w.chain].label.toUpperCase()}
                        </span>
                        <span className="font-mono truncate text-muted-foreground">
                          {w.nickname || truncate(w.address)}
                        </span>
                        {slot?.isLoading && (
                          <span className="ml-auto text-[10px] text-muted-foreground animate-pulse">...</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
        {streak.current > 0 && (
          <p className="text-xs text-muted-foreground mb-1">
            {'\ud83d\udd25'} {streak.current}-day streak
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Journalio v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
