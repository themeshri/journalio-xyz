import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FinalCta() {
  return (
    <section className="px-4 pb-20">
      <div className="bg-emerald-band mx-auto max-w-6xl overflow-hidden rounded-2xl px-8 py-14 text-center text-white sm:py-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stop journaling by hand. Start finding your leaks.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-white/85">
          Paste a wallet and see what your trades have really been costing you.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <a href="#early-access">
              Paste your wallet — it&apos;s free
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <a href="#features">See a sample report</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
