'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  ChevronRight,
  PanelLeftClose,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useIsMobile } from '@/hooks/use-mobile'
import { useWallet, useMetadata } from '@/lib/wallet-context'
import { computeTradeDiscipline, disciplineColor, type DisciplineResult } from '@/lib/discipline'
import type { JournalData } from '@/components/JournalModal'
import {
  PRODUCTS,
  PRODUCT_SECTIONS,
  productForPath,
  type NavItem,
  type ProductId,
} from '@/lib/nav-structure'


export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state, setOpen, openMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()
  const { tradeComments, journalMap } = useWallet()
  const { preSessionDone, todayRuleScore } = useMetadata()

  // Section list is driven by the product the current path belongs to — the
  // inner level of the two-level nav (lib/nav-structure.ts).
  const productId = productForPath(pathname)

  // On mobile the drawer lets you browse a product's sections WITHOUT
  // navigating: tapping a rail icon (except Home) previews that product's
  // section menu in place. `mobileProduct` is that previewed product; it
  // resets to the current page's product each time the drawer opens.
  const [mobileProduct, setMobileProduct] = useState<ProductId>(productId)
  useEffect(() => {
    if (openMobile) setMobileProduct(productId)
  }, [openMobile, productId])

  // Desktop shows the current product's sections; mobile shows the previewed
  // product's sections while the drawer is open.
  const shownProduct = isMobile ? mobileProduct : productId
  const sections = PRODUCT_SECTIONS[shownProduct]
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
            className="h-10 text-sm"
            onClick={() => { if (isMobile) setOpenMobile(false) }}
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
              className="h-10 text-sm"
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
                    onClick={() => { if (isMobile) setOpenMobile(false) }}
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

  // Home has a single "Dashboard" section — a one-item menu is noise, so the
  // section sidebar is omitted on desktop and the icon rail alone drives nav.
  // On mobile the rail is hidden, so the drawer must still render to carry the
  // product switcher (see the mobile product nav below).
  if (productId === 'home' && !isMobile) return null

  const sectionMenu = (
    <SidebarContent>
      <SidebarGroup className="px-3">
        {/* Journal gets a primary "Add Trade" CTA at the top of its section
            menu (TradeZella pattern), routing to the manual-trade flow. */}
        {shownProduct === 'journal' && (
          <Button asChild className="mb-3 w-full justify-center gap-1.5">
            <Link href="/trade-journal" onClick={() => { if (isMobile) setOpenMobile(false) }}>
              <Plus className="h-4 w-4" />
              Add Trade
            </Link>
          </Button>
        )}
        <SidebarMenu className="gap-1.5">
          {sections.map((item) => (
            <Fragment key={item.href}>
              {renderNavItem(item)}
              {item.dividerAfter && (
                <li className="my-1 border-t border-sidebar-border" role="separator" />
              )}
            </Fragment>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  )

  // Mobile: the icon rail is hidden in the layout (hidden md:block), so the
  // drawer reproduces the SAME two-level nav — the rail beside the section
  // menu — exactly as it appears on desktop, rather than a separate list.
  //
  // Tapping a rail icon does NOT navigate (except Home, which has no second
  // menu): it previews that product's sections in place so you can drill into
  // the intended section, matching how the desktop rail + sidebar behave.
  if (isMobile) {
    return (
      <Sidebar collapsible="offcanvas" data-tour="sidebar">
        <div className="flex h-full">
          <MobileRail
            shownProduct={shownProduct}
            onSelectProduct={(id) => {
              if (id === 'home') {
                // Home has no section menu — go straight there.
                setOpenMobile(false)
              } else {
                setMobileProduct(id)
              }
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col pt-3">{sectionMenu}</div>
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="offcanvas" data-tour="sidebar">
      {/* Spacer clearing the fixed full-width header (h-12). */}
      <SidebarHeader className="h-12" />
      {sectionMenu}
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

/**
 * The product icon rail as it appears inside the mobile drawer — the same
 * outer nav level as the desktop ProductRail, so mobile shows the identical
 * two-level nav (rail + section menu) rather than a bespoke list.
 *
 * A rail tap does NOT navigate; it selects which product's section menu the
 * drawer previews (`onSelectProduct`). Home is the exception — it has no
 * section menu, so its handler navigates instead. `shownProduct` drives the
 * active highlight so the rail reflects the previewed product.
 */
function MobileRail({
  shownProduct,
  onSelectProduct,
}: {
  shownProduct: ProductId
  onSelectProduct: (id: ProductId) => void
}) {
  return (
    <nav
      aria-label="Products"
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3"
    >
      {PRODUCTS.map((product) => {
        const Icon = product.icon
        const isActive = shownProduct === product.id
        const className = `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
          isActive
            ? 'bg-sidebar-accent text-emerald-500'
            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
        }`

        // Home routes straight to the dashboard (no second menu); every other
        // product previews its section list in the drawer without navigating.
        if (product.id === 'home') {
          return (
            <Link
              key={product.id}
              href={product.href}
              aria-label={product.label}
              onClick={() => onSelectProduct('home')}
              className={className}
            >
              <Icon className="h-[18px] w-[18px]" />
            </Link>
          )
        }

        return (
          <button
            key={product.id}
            type="button"
            aria-label={product.label}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelectProduct(product.id)}
            className={className}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        )
      })}
    </nav>
  )
}
