import { Suspense } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { WalletProvider } from '@/lib/wallet-context'
import { Separator } from '@/components/ui/separator'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense>
      <WalletProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm text-muted-foreground">
                Journalio
              </span>
            </header>
            <div className="flex-1 overflow-auto px-6 py-6">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </WalletProvider>
    </Suspense>
  )
}
