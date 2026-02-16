'use client'

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

const primaryNav = [
  { label: 'Overview', href: '/' },
  { label: 'Trade Journal', href: '/trade-journal' },
  { label: 'History', href: '/history' },
  { label: 'Analytics', href: '/analytics' },
]

const toolsNav = [
  { label: 'Missed Trades', href: '/missed-trades' },
  { label: 'Pre Session', href: '/pre-session' },
  { label: 'Strategies', href: '/strategies' },
]

const managementNav = [
  { label: 'Wallet Management', href: '/wallet-management' },
  { label: 'Settings', href: '/settings' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const walletParam = searchParams.get('wallet')
  const { currentWallet } = useWallet()

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
              <Link href={buildHref(item.href)}>{item.label}</Link>
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
          <SidebarGroupLabel className="text-xs text-muted-foreground">Tools</SidebarGroupLabel>
          {renderNavGroup(toolsNav)}
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
