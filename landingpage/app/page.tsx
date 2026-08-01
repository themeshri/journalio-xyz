import { Nav } from '@/components/site/nav'
import { Hero } from '@/components/site/hero'
import { StatStrip } from '@/components/site/stat-strip'
import { Overview } from '@/components/site/overview'
import { Features } from '@/components/site/features'
import { HowItWorks } from '@/components/site/how-it-works'
import { ValueProp } from '@/components/site/value-prop'
import { Faq } from '@/components/site/faq'
import { EarlyAccess } from '@/components/site/early-access'
import { FinalCta } from '@/components/site/final-cta'
import { Footer } from '@/components/site/footer'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <StatStrip />
        <Overview />
        <Features />
        <HowItWorks />
        <ValueProp />
        <Faq />
        <EarlyAccess />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
