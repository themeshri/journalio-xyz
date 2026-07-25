'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  ChevronRight,
  PanelLeftClose,
} from 'lucide-react'
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
  SidebarGroup,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { useWallet, useMetadata } from '@/lib/wallet-context'
import { computeTradeDiscipline, disciplineColor, type DisciplineResult } from '@/lib/discipline'
import type { JournalData } from '@/components/JournalModal'
import {
  PRODUCTS,
  PRODUCT_SECTIONS,
  productForPath,
  type NavItem,
} from '@/lib/nav-structure'


export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state, setOpen, toggleSidebar } = useSidebar()
  const { tradeComments, journalMap } = useWallet()
  const { preSessionDone, todayRuleScore } = useMetadata()

  // Section list is driven by the product the current path belongs to — the
  // inner level of the two-level nav (lib/nav-structure.ts).
  const productId = productForPath(pathname)
  const activeProduct = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0]
  const sections = PRODUCT_SECTIONS[productId]
  const [disciplineDotColor, setDisciplineDotColor] = useState<'emerald' | 'yellow' | 'red' | null>(null)

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

  function renderBadge(badge?: NavItem['badge']) {
    if (badge === 'ruleScore') {
      // Today's rule adherence, e.g. "3/5" — the score-first framing from
      // docs §5, surfaced in the nav so the target is visible before you click.
      if (!todayRuleScore || todayRuleScore.total === 0) return null
      const complete = todayRuleScore.followed === todayRuleScore.total
      return (
        <span
          className={`ml-auto shrink-0 font-mono text-[10px] tabular-nums ${
            complete ? 'text-emerald-500' : 'text-muted-foreground'
          }`}
          title={`${todayRuleScore.followed} of ${todayRuleScore.total} rules followed today`}
        >
          {todayRuleScore.followed}/{todayRuleScore.total}
        </span>
      )
    }
    if (badge === 'preSession') {
      return (
        <span
          className={`ml-auto inline-block h-2 w-2 rounded-full shrink-0 ${
            preSessionDone ? 'bg-emerald-500' : 'bg-zinc-400'
          }`}
          title={preSessionDone ? 'Completed today' : 'Not completed today'}
        />
      )
    }
    if (badge === 'discipline' && disciplineDotColor) {
      return (
        <span
          className={`ml-auto inline-block h-2 w-2 rounded-full shrink-0 ${
            disciplineDotColor === 'emerald' ? 'bg-emerald-500' : disciplineDotColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
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
            <Link href={item.href} {...(item.dataTour ? { 'data-tour': item.dataTour } : {})}>
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

  return (
    <Sidebar collapsible="icon" data-tour="sidebar">
      {/* Spacer clearing the fixed full-width header (h-12); the wordmark,
          hamburger, and wallet summary now live in that header. */}
      <SidebarHeader className="h-12" />
      <SidebarContent>
        <SidebarGroup>
          {/* Names the active product so the rail selection is legible even
              when several products share similar section labels. */}
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
            {activeProduct.label}
          </div>
          <SidebarMenu>{sections.map(renderNavItem)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 py-3">
        <SidebarMenu>
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
