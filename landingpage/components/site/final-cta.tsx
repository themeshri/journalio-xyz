import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FinalCta() {
  return (
    <section className="px-4 pb-20">
      <div className="bg-emerald-band mx-auto max-w-6xl overflow-hidden rounded-2xl px-8 py-14 text-center text-white sm:py-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Find your biggest leak tonight.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-white/85">
          One wallet address. About a minute. Then you&apos;ll know what
          you&apos;ve actually been paying for.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" variant="secondary">
            <a href="#early-access">
              Paste your wallet — it&apos;s free
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
        <p className="mt-5 text-sm text-white/75">
          Read-only · No card · Free while in beta
        </p>
      </div>
    </section>
  )
}
