import { ArrowRight, Check, RefreshCw } from 'lucide-react'
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
            On-chain trading journal
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your on-chain trades,{' '}
            <span className="text-primary">journaled automatically.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Paste a Solana or EVM wallet and Journalio imports every swap into
            clean P&amp;L trades — then closes the loop with pre-session intent,
            post-session review, rule discipline, and analytics. No spreadsheets.
            No manual logging.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href="#early-access">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            Free while in beta · No card required · Solana, Base &amp; BNB
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
                <p className="text-xs font-medium">Auto-import successful</p>
                <p className="text-[11px] text-muted-foreground">
                  12 trades pulled from your wallet
                </p>
              </div>
            </div>
          </FloatingCard>

          {/* Discipline score card */}
          <FloatingCard className="absolute -right-3 -top-5 w-44 sm:-right-6">
            <p className="text-[11px] text-muted-foreground">Today&apos;s discipline</p>
            <p className="text-mono text-lg font-bold text-emerald-500">4 / 5</p>
            <div className="mt-1 flex gap-1">
              {[1, 1, 1, 1, 0].map((on, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    on ? 'bg-emerald-500' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Check className="h-3 w-3 text-emerald-500" /> Pre-session done
            </p>
          </FloatingCard>
        </div>
      </div>
    </section>
  )
}
