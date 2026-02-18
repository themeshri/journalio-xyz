'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
import { useWallet } from '@/lib/wallet-context'

function isPreSessionCompletedToday(): boolean {
  try {
    const raw = localStorage.getItem('journalio_pre_sessions')
    if (!raw) return false
    const sessions: { date: string }[] = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    return sessions.some((s) => s.date === today)
  } catch {
    return false
  }
}

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
  const searchParams = useSearchParams()
  const walletParam = searchParams.get('wallet')
  const { currentWallet } = useWallet()
  const [preSessionDone, setPreSessionDone] = useState(false)

  useEffect(() => {
    setPreSessionDone(isPreSessionCompletedToday())

    function onStorage(e: StorageEvent) {
      if (e.key === 'journalio_pre_sessions') {
        setPreSessionDone(isPreSessionCompletedToday())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function buildHref(base: string) {
    if (walletParam) {
      return `${base}?wallet=${encodeURIComponent(walletParam)}`
    }
    return base
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
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
              <Link href={buildHref(item.href)}>
                {item.label}
                {item.href === '/pre-session' && (
                  <span
                    className={`ml-auto inline-block h-2 w-2 rounded-full ${
                      preSessionDone ? 'bg-emerald-500' : 'bg-zinc-400'
                    }`}
                    title={preSessionDone ? 'Completed today' : 'Not completed today'}
                  />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    )
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <div className="text-base font-semibold tracking-tight">
          Journalio
        </div>
        <Link
          href={buildHref('/wallet-management')}
          className="mt-1 block text-xs text-muted-foreground hover:text-foreground transition-colors font-mono truncate"
          title={currentWallet || 'No wallet selected'}
        >
          {currentWallet
            ? `${currentWallet.slice(0, 4)}...${currentWallet.slice(-4)}`
            : 'No wallet selected'}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {renderNavGroup(primaryNav)}
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          {renderNavGroup(managementNav)}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Journalio v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
