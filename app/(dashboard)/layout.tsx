import { Suspense } from 'react'
import Link from 'next/link'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ProductRail } from '@/components/nav/ProductRail'
import { DashboardProviders } from '@/lib/contexts'
import { StaleDataBanner } from '@/components/StaleDataBanner'
import { LocalStorageMigration } from '@/components/LocalStorageMigration'
import { OnboardingGate } from '@/components/onboarding/OnboardingGate'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccountDropdown } from '@/components/AccountDropdown'
import { PageToolbar } from '@/components/PageToolbar'
import { SyncButton } from '@/components/SyncButton'
import { Breadcrumbs } from '@/components/Breadcrumbs'

function DashboardSkeleton() {
  return (
    <div className="flex h-screen flex-col animate-pulse">
      {/* Full-width top header skeleton */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <div className="h-6 w-6 bg-muted rounded" />
        <div className="h-5 w-24 bg-muted rounded" />
        <div className="ml-auto h-6 w-40 bg-muted rounded" />
      </div>
      {/* Rail + sidebar + content row */}
      <div className="flex flex-1">
        <div className="hidden w-14 border-r bg-sidebar md:block" />
        <div className="hidden w-56 border-r bg-sidebar p-4 md:block">
          <div className="space-y-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 w-full bg-muted rounded" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="h-6 w-32 bg-muted rounded mb-6" />
          <div className="flex gap-10 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardProviders>
        {/* --sidebar-offset reserves the rail's width (w-14 = 3.5rem) so the
            fixed section sidebar sits beside it rather than on top of it. */}
        <SidebarProvider
          style={{ '--sidebar-offset': '3.5rem' } as React.CSSProperties}
        >
          {/* Full-width top header. Sticky + opaque + z-30 so the fixed section
              sidebar (z-10) and rail pass under it; their content is pushed
              below via top padding rather than editing the generated
              components/ui/sidebar.tsx. */}
          <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-2 border-b bg-background px-3">
            {/* Left: hamburger + wordmark, sized to sit over the nav column. */}
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Link href="/" className="text-base font-semibold tracking-tight">
                Journalio
              </Link>
            </div>
            {/* Filters/Date/Wallets moved into the page content (PageToolbar),
                TradeZella-style; the top bar keeps only global chrome. */}
            <div className="ml-auto flex items-center gap-2">
              <SyncButton />
              <ThemeToggle />
              <AccountDropdown />
            </div>
          </header>

          {/* Nav + content row, offset below the fixed header. */}
          <div className="hidden md:block">
            <ProductRail />
          </div>
          <AppSidebar />
          <SidebarInset className="pt-12">
            <OnboardingGate />
            <div className="flex-1 overflow-auto px-6 py-6">
              <LocalStorageMigration />
              <StaleDataBanner />
              <PageToolbar />
              <Breadcrumbs />
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </DashboardProviders>
    </Suspense>
  )
}
