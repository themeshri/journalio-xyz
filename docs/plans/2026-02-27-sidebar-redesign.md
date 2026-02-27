# Sidebar Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure sidebar with Lucide icons, collapsible icon-only mode, and nested sub-tab navigation for Diary, History, and Chart Lab.

**Architecture:** Leverage existing shadcn `Sidebar` with `collapsible="icon"`, `SidebarMenuSub`/`SidebarMenuSubButton` for nested items, and `@radix-ui/react-collapsible` for expandable parent groups. Parent items with children auto-expand the sidebar when clicked in collapsed mode. New routes created for Diary and Chart Lab; History sub-tabs stay as query params.

**Tech Stack:** Next.js App Router, shadcn/ui sidebar, Lucide React icons, Radix Collapsible, Tailwind v4

---

### Task 1: Add shadcn Collapsible component

**Files:**
- Create: `components/ui/collapsible.tsx`

**Step 1: Add the collapsible component**

```tsx
"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/ui/collapsible.tsx
git commit -m "feat: add shadcn collapsible component"
```

---

### Task 2: Create placeholder route pages

Create minimal placeholder pages for new routes. These will be fleshed out in later phases.

**Files:**
- Create: `app/(dashboard)/diary/pre-session/page.tsx` (copy from existing)
- Create: `app/(dashboard)/diary/post-session/page.tsx` (placeholder)
- Create: `app/(dashboard)/diary/notes/page.tsx` (placeholder)
- Create: `app/(dashboard)/chart-lab/page.tsx` (redirect to calendar)
- Create: `app/(dashboard)/chart-lab/calendar/page.tsx` (placeholder)

**Step 1: Move pre-session page to new route**

Copy the entire contents of `app/(dashboard)/pre-session/page.tsx` to `app/(dashboard)/diary/pre-session/page.tsx`. The file is a self-contained `'use client'` component — no changes needed to its content.

Keep the original `app/(dashboard)/pre-session/page.tsx` but replace its contents with a redirect:

```tsx
import { redirect } from 'next/navigation'

export default function PreSessionRedirect() {
  redirect('/diary/pre-session')
}
```

**Step 2: Create post-session placeholder**

`app/(dashboard)/diary/post-session/page.tsx`:

```tsx
export default function PostSessionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post-Session</h1>
        <p className="text-sm text-muted-foreground mt-1">
          End-of-day trading review. Coming soon.
        </p>
      </div>
    </div>
  )
}
```

**Step 3: Create notes placeholder**

`app/(dashboard)/diary/notes/page.tsx`:

```tsx
export default function NotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Free-form trading notebook. Coming soon.
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Create chart-lab redirect and calendar placeholder**

`app/(dashboard)/chart-lab/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function ChartLabRedirect() {
  redirect('/chart-lab/calendar')
}
```

`app/(dashboard)/chart-lab/calendar/page.tsx`:

```tsx
export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          P/L calendar view. Coming soon.
        </p>
      </div>
    </div>
  )
}
```

**Step 5: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds, new routes accessible

**Step 6: Commit**

```bash
git add app/(dashboard)/diary/ app/(dashboard)/chart-lab/ app/(dashboard)/pre-session/page.tsx
git commit -m "feat: add diary and chart-lab route placeholders, redirect old pre-session"
```

---

### Task 3: Update dashboard layout for collapsible sidebar

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

**Step 1: Pass collapsible="icon" to Sidebar**

In `app/(dashboard)/layout.tsx`, the `<AppSidebar />` renders the `<Sidebar>` component inside `app-sidebar.tsx`. We need to pass the `collapsible` prop through.

Edit `app/(dashboard)/layout.tsx` — no changes needed here actually, because the `collapsible` prop is set on the `<Sidebar>` component inside `app-sidebar.tsx`, not in the layout. We'll handle this in Task 4.

However, update the layout header to be cleaner — remove the "Journalio" text since the sidebar header already shows it:

In `app/(dashboard)/layout.tsx`, change the header:

```tsx
<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
  <SidebarTrigger className="-ml-1" />
</header>
```

(Remove the `<Separator>` and `<span>Journalio</span>` — redundant with sidebar header.)

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add app/(dashboard)/layout.tsx
git commit -m "feat: simplify dashboard header"
```

---

### Task 4: Rewrite app-sidebar.tsx with icons and sub-tabs

This is the main task. Rewrite the sidebar to use icons, collapsible groups, and sub-tab navigation.

**Files:**
- Modify: `components/app-sidebar.tsx`

**Step 1: Write the new sidebar**

Replace the entire contents of `components/app-sidebar.tsx` with the implementation below.

Key changes from current:
- Import Lucide icons: `Home, BookOpen, BookHeart, Clock, FlaskConical, BarChart3, Puzzle, Wallet, Settings, ChevronRight`
- Import `Collapsible, CollapsibleTrigger, CollapsibleContent` from `components/ui/collapsible`
- Import `SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem` from `components/ui/sidebar`
- Import `useSidebar` from `components/ui/sidebar`
- Change `<Sidebar>` to `<Sidebar collapsible="icon">`
- Define nav items as structured data with optional `children` arrays
- Use `Collapsible` for parent items with children
- Use `SidebarMenuSub` + `SidebarMenuSubButton` for sub-items
- Parent items in collapsed mode: clicking auto-expands sidebar via `useSidebar().setOpen(true)`
- `tooltip` prop on every `SidebarMenuButton` for collapsed-mode labels
- Pre-session dot moves to Diary parent
- Discipline dot stays on Journal
- Wallet toggles section unchanged
- Footer unchanged

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Home,
  BookOpen,
  BookHeart,
  Clock,
  FlaskConical,
  BarChart3,
  Puzzle,
  Wallet,
  Settings as SettingsIcon,
  ChevronRight,
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
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
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
    label: 'Diary',
    href: '/diary',
    icon: BookHeart,
    badge: 'preSession',
    children: [
      { label: 'Pre-Session', href: '/diary/pre-session' },
      { label: 'Post-Session', href: '/diary/post-session' },
      { label: 'Notes', href: '/diary/notes' },
    ],
  },
  {
    label: 'History',
    href: '/history',
    icon: Clock,
    children: [
      { label: 'Pre-Sessions', href: '/history?tab=pre-sessions' },
      { label: 'Journal', href: '/history?tab=journal' },
      { label: 'Transactions', href: '/history?tab=transactions' },
      { label: 'Missed Trades', href: '/history?tab=missed-trades' },
      { label: 'Chartbook', href: '/history?tab=chartbook' },
    ],
  },
  {
    label: 'Chart Lab',
    href: '/chart-lab',
    icon: FlaskConical,
    children: [
      { label: 'Calendar', href: '/chart-lab/calendar' },
    ],
  },
]

const managementNav: NavItem[] = [
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Strategies', href: '/strategies', icon: Puzzle },
  { label: 'Wallet Mgmt', href: '/wallet-management', icon: Wallet },
  { label: 'Settings', href: '/settings', icon: SettingsIcon },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state, setOpen } = useSidebar()
  const { activeWallets, savedWallets, setWalletActive, walletSlots, streak, tradeComments, journalMap } = useWallet()
  const { preSessionDone } = useMetadata()
  const [walletsExpanded, setWalletsExpanded] = useState(false)
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

  function isWalletActive(address: string, chain: Chain): boolean {
    return activeWallets.some((w) => w.address === address && w.chain === chain)
  }

  function truncate(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  function renderBadge(badge?: 'preSession' | 'discipline') {
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
    // If sidebar is collapsed, expand it so sub-items are visible
    if (state === 'collapsed') {
      setOpen(true)
    }
  }

  function renderNavItem(item: NavItem) {
    if (!item.children) {
      // Simple nav item — no children
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

    // Nav item with children — collapsible group
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
          Journalio
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
                <div className="px-2 space-y-1 group-data-[collapsible=icon]:hidden">
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
        <div className="group-data-[collapsible=icon]:hidden">
          {streak.current > 0 && (
            <p className="text-xs text-muted-foreground mb-1">
              {'\ud83d\udd25'} {streak.current}-day streak
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Journalio v1.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
```

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds

**Step 3: Manual verification**

Run: `npm run dev`

Test:
1. All sidebar items show icons
2. Click Diary — sub-items appear (Pre-Session, Post-Session, Notes)
3. Click History — sub-items appear with query-param links
4. Click Chart Lab — sub-item Calendar appears
5. Press `Cmd+B` — sidebar collapses to icons only
6. Hover icons in collapsed mode — tooltips show labels
7. Click Diary icon in collapsed mode — sidebar expands
8. Pre-session green/gray dot appears on Diary
9. Discipline dot appears on Journal
10. Navigate to `/diary/pre-session` — pre-session form loads
11. Navigate to `/pre-session` — redirects to `/diary/pre-session`
12. Wallet toggles section still works
13. Mobile: sidebar opens as sheet

**Step 4: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: rewrite sidebar with icons, collapse, and sub-tab navigation"
```

---

### Task 5: Update any hardcoded /pre-session links

Search the codebase for any `href="/pre-session"` links (other than the redirect page) and update them to `/diary/pre-session`.

**Files:**
- Search and modify any files linking to `/pre-session`

**Step 1: Find all references**

Search for: `"/pre-session"` or `'/pre-session'` across all `.tsx` files, excluding `app/(dashboard)/pre-session/page.tsx` (the redirect) and `app-sidebar.tsx` (already updated).

Known locations from exploration:
- `components/app-sidebar.tsx` — already updated
- `app/(dashboard)/pre-session/page.tsx` — redirect, keep as-is
- Any action banners or links on the Overview page pointing to pre-session

Update all found references from `/pre-session` to `/diary/pre-session`.

**Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add -u
git commit -m "fix: update pre-session links to new diary route"
```

---

### Task 6: Final build verification

**Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Commit all remaining changes (if any)**

If any files were missed, stage and commit them.

---

## Summary of all files touched

| Action | File |
|--------|------|
| Create | `components/ui/collapsible.tsx` |
| Create | `app/(dashboard)/diary/pre-session/page.tsx` |
| Create | `app/(dashboard)/diary/post-session/page.tsx` |
| Create | `app/(dashboard)/diary/notes/page.tsx` |
| Create | `app/(dashboard)/chart-lab/page.tsx` |
| Create | `app/(dashboard)/chart-lab/calendar/page.tsx` |
| Modify | `app/(dashboard)/pre-session/page.tsx` (replace with redirect) |
| Modify | `app/(dashboard)/layout.tsx` (simplify header) |
| Modify | `components/app-sidebar.tsx` (full rewrite) |
| Modify | Any files with `/pre-session` links |
