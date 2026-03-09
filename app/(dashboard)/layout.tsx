import { Suspense } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardProviders } from '@/lib/contexts'
import { StaleDataBanner } from '@/components/StaleDataBanner'
import { LocalStorageMigration } from '@/components/LocalStorageMigration'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AccountDropdown } from '@/components/AccountDropdown'
import { GlobalFilterBar } from '@/components/GlobalFilterBar'
import { SyncButton } from '@/components/SyncButton'
import { Breadcrumbs } from '@/components/Breadcrumbs'

function DashboardSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r bg-sidebar p-4 space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-full bg-muted rounded" />
          ))}
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 p-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-6" />
        <div className="flex gap-10 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-20 bg-muted rounded" />
          ))}
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
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="md:hidden" />
              <div className="hidden md:block">
                <GlobalFilterBar />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <SyncButton />
                <ThemeToggle />
                <AccountDropdown />
              </div>
            </header>
            <div className="flex-1 overflow-auto px-6 py-6">
              <LocalStorageMigration />
              <StaleDataBanner />
              <Breadcrumbs />
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </DashboardProviders>
    </Suspense>
  )
}
