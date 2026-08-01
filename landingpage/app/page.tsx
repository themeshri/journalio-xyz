import { Nav } from '@/components/site/nav'
import { Hero } from '@/components/site/hero'
import { Problem } from '@/components/site/problem'
import { CostOfInaction } from '@/components/site/cost-of-inaction'
import { SymptomChecklist } from '@/components/site/symptom-checklist'
import { FalseBelief } from '@/components/site/false-belief'
import { ProblemMechanism } from '@/components/site/problem-mechanism'
import { ProductIntro } from '@/components/site/product-intro'
import { SolutionMechanism } from '@/components/site/solution-mechanism'
import { HowItWorks } from '@/components/site/how-it-works'
import { TimeToResult } from '@/components/site/time-to-result'
import { UsVsThem } from '@/components/site/us-vs-them'
import { Qualification } from '@/components/site/qualification'
import { Scarcity } from '@/components/site/scarcity'
import { EarlyAccess } from '@/components/site/early-access'
import { FinalCta } from '@/components/site/final-cta'
import { Faq } from '@/components/site/faq'
import { Footer } from '@/components/site/footer'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        {/* Hook */}
        <Hero />

        {/* Problem */}
        <Problem />
        <CostOfInaction />
        <SymptomChecklist />
        <FalseBelief />
        <ProblemMechanism />

        {/* Solution */}
        <ProductIntro />
        <SolutionMechanism />
        <HowItWorks />
        <TimeToResult />
        <UsVsThem />

        {/* Proof — UgcWall and Reviews are built but deliberately NOT mounted.
            Empty placeholder tiles read as "nobody uses this", which is worse
            than no section at all. Re-add both once real beta quotes exist:
              import { UgcWall } from '@/components/site/ugc-wall'
              import { Reviews } from '@/components/site/reviews'
            One specific quote from a trader with the reader's exact problem is
            worth more than any number of logos. */}

        {/* Close */}
        <Qualification />
        <Scarcity />
        <EarlyAccess />
        <FinalCta />
        <Faq />
      </main>
      <Footer />
    </>
  )
}
