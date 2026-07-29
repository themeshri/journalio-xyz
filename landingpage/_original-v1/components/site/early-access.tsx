'use client'

import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CONTACT_EMAIL } from '@/lib/config'

export function EarlyAccess() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    // No backend yet — open a pre-filled email to request access.
    const subject = encodeURIComponent('Journalio early access')
    const body = encodeURIComponent(`Please add me to the Journalio beta.\n\nEmail: ${email}`)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <section id="early-access" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center sm:p-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Free while in beta
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Journalio is free to use during the beta. Drop your email to get
          early access and help shape the roadmap.
        </p>

        {sent ? (
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Thanks — your email app is opening.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="h-11 bg-background"
            />
            <Button type="submit" size="lg" className="shrink-0">
              Get early access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          No card required · No paid plans yet
        </p>
      </div>
    </section>
  )
}
