import { ArrowDown, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BeforeAfter } from '@/components/media/before-after'

const OBJECTIONS = [
  'No manual logging — trades import themselves',
  'Read-only address. No keys, no custody',
  'Free while in beta. No card',
]

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-hero-glow">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Green week, red month?{' '}
          <span className="text-primary">
            Find the trades bleeding your account
          </span>{' '}
          in one session — no spreadsheet needed.
        </h1>

        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Paste a wallet. Every swap becomes a real P&amp;L trade, and the leaks
          you can&apos;t see get ranked by what they actually cost you.
        </p>

        <ul className="mt-7 grid gap-2.5 sm:grid-cols-3">
          {OBJECTIONS.map((o) => (
            <li key={o} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-muted-foreground">{o}</span>
            </li>
          ))}
        </ul>

        {/* Soft CTA leads (cold traffic scrolls into the problem), but anyone
            already convinced needs a way to act without a scroll marathon. */}
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button asChild size="lg">
            <a href="#problem">
              Show me what I&apos;m losing
              <ArrowDown className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <a
            href="#early-access"
            className="group inline-flex items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Already convinced? Paste a wallet
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <div className="mt-14">
          <BeforeAfter />
        </div>
      </div>
    </section>
  )
}
