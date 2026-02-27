# Sidebar Redesign — Phase 1 Design

## Problem

The current sidebar is text-only navigation with no icons, no collapse functionality, and flat structure (no sub-tabs). The app is growing with new sections (Diary, Chart Lab) that need nested navigation, and users need a collapsible sidebar for more screen space.

## Solution

Restructure the sidebar using existing shadcn sidebar primitives (`collapsible="icon"`, `SidebarMenuSub`, tooltip support) to add Lucide icons, collapse-to-icon mode, and nested sub-tab navigation.

## Navigation Structure

```
MAIN NAV (with Lucide line icons):
  Home              (Home)              → /
  Journal           (BookOpen)          → /trade-journal
  Diary             (BookHeart)         → parent (expands sidebar if collapsed)
    ├─ Pre-Session                      → /diary/pre-session
    ├─ Post-Session                     → /diary/post-session
    └─ Notes                            → /diary/notes
  History           (Clock)             → parent (expands sidebar if collapsed)
    ├─ Pre-Sessions                     → /history?tab=pre-sessions
    ├─ Journal                          → /history?tab=journal
    ├─ Transactions                     → /history?tab=transactions
    ├─ Missed Trades                    → /history?tab=missed-trades
    └─ Chartbook                        → /history?tab=chartbook
  Chart Lab         (FlaskConical)      → parent (expands sidebar if collapsed)
    ├─ Calendar                         → /chart-lab/calendar
    └─ [future sub-tabs]
─── separator ───
MANAGEMENT NAV:
  Analytics         (BarChart3)         → /analytics
  Strategies        (Puzzle)            → /strategies
  Wallet Mgmt       (Wallet)           → /wallet-management
  Settings          (Settings)          → /settings
─── separator ───
WALLETS (expandable, same as current)
─── footer ───
Streak + Version
```

## Behavior

### Collapse/Expand
- `Sidebar` gets `collapsible="icon"` prop
- `SidebarTrigger` already in dashboard header toggles state
- `Cmd+B` keyboard shortcut already wired in shadcn sidebar
- State persisted via cookie (already handled by shadcn sidebar)

### Collapsed Mode
- Shows only icons (3rem width)
- Tooltips on hover (via `SidebarMenuButton` tooltip prop)
- Sub-items hidden (`SidebarMenuSub` has `group-data-[collapsible=icon]:hidden`)
- Clicking a parent item with sub-tabs auto-expands the sidebar

### Sub-tab Navigation
- Parent items with children are expandable/collapsible in expanded mode
- Use `Collapsible` + `SidebarMenuSub` + `SidebarMenuSubButton` (shadcn pattern)
- Active parent auto-opens if any child route is active
- Sub-items have no icons, just text with left border line (shadcn default)

### Status Indicators
- Pre-Session dot (green/gray) moves to Diary parent item
- Discipline dot stays on Journal item
- Wallet summary stays in header
- Streak stays in footer

## Files to Modify

| File | Change |
|------|--------|
| `components/app-sidebar.tsx` | Major rewrite — icons, collapsible groups, sub-tabs |
| `app/(dashboard)/layout.tsx` | Change `Sidebar` to `collapsible="icon"` |
| `app/(dashboard)/diary/pre-session/page.tsx` | New route — move existing pre-session content |
| `app/(dashboard)/diary/post-session/page.tsx` | New placeholder page |
| `app/(dashboard)/diary/notes/page.tsx` | New placeholder page |
| `app/(dashboard)/chart-lab/page.tsx` | New placeholder page (redirects to calendar) |
| `app/(dashboard)/chart-lab/calendar/page.tsx` | New placeholder page |

## Existing Components to Reuse

- `Sidebar` with `collapsible="icon"` — `components/ui/sidebar.tsx:165`
- `SidebarMenuSub` — `components/ui/sidebar.tsx:695` (nested items with left border)
- `SidebarMenuSubButton` — `components/ui/sidebar.tsx:718` (sub-item button with active state)
- `SidebarMenuButton` tooltip prop — `components/ui/sidebar.tsx:546` (auto-shows in collapsed mode)
- `Collapsible` from radix-ui (for expandable parent items)
- `useSidebar()` hook — access `state`, `setOpen`, `toggleSidebar`

## Verification

1. `npm run build` — no build errors
2. All sidebar links navigate correctly
3. Sub-tabs expand/collapse properly
4. Collapsed mode shows only icons with tooltips
5. Clicking parent in collapsed mode expands sidebar
6. Pre-session status dot appears on Diary
7. Discipline dot appears on Journal
8. `Cmd+B` toggles sidebar
9. Mobile: sidebar opens as sheet (existing behavior preserved)
10. Wallet toggles section still works
