import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeviceFrame } from '@/components/media/device-frame'
import { MockDashboard } from '@/components/media/mock-dashboard'

export function ProductIntro() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Meet Journalio
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The journal that{' '}
            <span className="text-primary">fills itself in.</span>
          </h2>

          <div className="mt-5 space-y-4 text-lg text-muted-foreground">
            <p>
              Journalio reads your wallet, rebuilds every position from the
              chain, and hands you the month you were supposed to be keeping —
              without logging a single fill.
            </p>
            <p>
              Then it ranks what your habits actually cost, in dollars.
            </p>
          </div>

          <div className="mt-8">
            <Button asChild size="lg">
              <a href="#early-access">
                Paste your wallet — it&apos;s free
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        <DeviceFrame>
          <MockDashboard />
        </DeviceFrame>
      </div>
    </section>
  )
}
