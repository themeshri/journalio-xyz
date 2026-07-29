import { Twitter, Github, MessageCircle } from 'lucide-react'
import { APP_URL, CONTACT_EMAIL } from '@/lib/config'

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how' },
      { label: 'Analytics', href: '#analytics' },
      { label: 'Early access', href: '#early-access' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Docs', href: '#' },
      { label: 'Changelog', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: `mailto:${CONTACT_EMAIL}` },
      { label: 'Log in', href: APP_URL },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="h-7 w-7" />
              <span className="text-base font-semibold tracking-tight">
                Journalio
              </span>
            </div>
            <p className="mt-3 max-w-xs text-xs text-muted-foreground">
              The on-chain trading journal for Solana &amp; EVM. Import, journal,
              review, improve.
            </p>
            <div className="mt-4 flex gap-2">
              {[Twitter, Github, MessageCircle].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t pt-6">
          <p className="max-w-3xl text-xs text-muted-foreground">
            Journalio is a journaling and analytics tool, not financial advice.
            Trading crypto involves substantial risk of loss and is not suitable
            for everyone. Only trade with capital you can afford to lose.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            © {new Date().getFullYear()} Journalio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
