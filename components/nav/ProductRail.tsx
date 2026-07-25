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
 * Thin icon rail — the outer level of the two-level navigation (docs §1).
 *
 * Switching products swaps the section sidebar beside it, which is what lets
 * new surfaces be added without crowding a single flat nav.
 */
export function ProductRail() {
  const pathname = usePathname()
  const active = productForPath(pathname)

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
