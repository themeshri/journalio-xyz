import { ArrowRight, RefreshCw, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeviceFrame } from '@/components/media/device-frame'
import { MockDashboard } from '@/components/media/mock-dashboard'
import { FloatingCard } from '@/components/media/floating-card'

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-hero-glow">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <Badge variant="secondary" className="mb-5 rounded-full px-3 py-1">
            For Solana &amp; EVM traders who hate spreadsheets
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find out what&apos;s{' '}
            <span className="text-primary">costing you money.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Paste a Solana or EVM wallet. Every swap becomes a clean P&amp;L
            trade — and Journalio shows you which setups print and which ones
            bleed. No spreadsheets. No manual logging.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href="#early-access">
                Paste your wallet — it&apos;s free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Free in beta · No card · See your first insight in 60 seconds
          </p>
        </div>

        {/* Device + floating cards */}
        <div className="relative">
          <DeviceFrame>
            <MockDashboard />
          </DeviceFrame>

          {/* Auto-import feed card */}
          <FloatingCard className="absolute -bottom-5 -left-4 w-56 sm:-left-8">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium">Wallet imported</p>
                <p className="text-[11px] text-muted-foreground">
                  248 swaps · 92 P&amp;L trades
                </p>
              </div>
            </div>
          </FloatingCard>

          {/* Insight card — value, not status */}
          <FloatingCard className="absolute -right-3 -top-5 w-52 sm:-right-6">
            <div className="mb-1 flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15">
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Biggest leak
              </p>
            </div>
            <p className="text-mono text-lg font-bold text-red-500">-$1,840</p>
            <p className="text-[11px] text-muted-foreground">
              on trades you chased after a loss
            </p>
          </FloatingCard>
        </div>
      </div>
    </section>
  )
}
