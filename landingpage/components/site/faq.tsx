import { SectionHeader } from './section-header'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS = [
  {
    q: 'Is it safe? Do you need my keys?',
    a: 'No keys, ever. Journalio only reads public wallet addresses to import your trade history — it can never move funds or sign transactions. It’s read-only by design.',
  },
  {
    q: 'Which chains and wallets does it support?',
    a: 'Solana and EVM chains (Base and BNB) today. Paste any public address on a supported chain and your swaps import automatically.',
  },
  {
    q: 'Do I have to log trades manually?',
    a: 'Never. Journalio turns your on-chain swaps into clean P&L trades for you. You just add the context — notes, tags, and reviews — where it matters.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes — Journalio is free while it’s in beta. Beta users lock in free access before paid plans launch. No card required to start.',
  },
]

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <SectionHeader eyebrow="FAQ" title="Questions," accent="answered." />
      <Accordion type="single" collapsible className="mt-10">
        {FAQS.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="text-left text-base">
              {f.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {f.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
