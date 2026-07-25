'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PRODUCTS, productForPath } from '@/lib/nav-structure'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * The outer level of the two-level navigation (docs §1) — the product switcher.
 *
 * Home has no second-level section menu (its only section is the dashboard
 * itself), so on Home the rail EXPANDS to a labelled nav (icon + text) that
 * fills the space, TradeZella-style. On every other product the rail stays a
 * thin icon-only rail with the section sidebar beside it.
 */
export function ProductRail() {
  const pathname = usePathname()
  const active = productForPath(pathname)
  const expanded = active === 'home'

  if (expanded) {
    return (
      <nav
        aria-label="Products"
        className="flex h-full w-56 shrink-0 flex-col gap-1 border-r bg-sidebar p-3"
      >
        {PRODUCTS.map((product) => {
          const Icon = product.icon
          const isActive = active === product.id
          return (
            <Link
              key={product.id}
              href={product.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-accent font-medium text-emerald-500'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span>{product.label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav
      aria-label="Products"
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3"
    >
      <TooltipProvider delayDuration={0}>
        {PRODUCTS.map((product) => {
          const Icon = product.icon
          const isActive = active === product.id
          return (
            <Tooltip key={product.id}>
              <TooltipTrigger asChild>
                <Link
                  href={product.href}
                  aria-label={product.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-emerald-500'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{product.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </nav>
  )
}
