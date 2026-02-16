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
} from '@/components/ui/sidebar'
import { SidebarWalletInput } from './sidebar-wallet-input'

const navItems = [
  { label: 'Overview', href: '/' },
  { label: 'Trades', href: '/trades' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Journal', href: '/journal' },
  { label: 'Settings', href: '/settings' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const walletParam = searchParams.get('wallet')

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

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <div className="text-base font-semibold tracking-tight">
          Journalio
        </div>
        <SidebarSeparator className="my-3" />
        <SidebarWalletInput />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
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
      </SidebarContent>
      <SidebarFooter className="px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Journalio v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
