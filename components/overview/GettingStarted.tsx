'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Wallet, Globe, BookOpen, ClipboardList } from 'lucide-react'

interface GettingStartedProps {
  hasWallets: boolean
  hasTimezone: boolean
  hasStrategies: boolean
  preSessionDone: boolean
}

const steps = [
  {
    key: 'wallet',
    label: 'Connect a wallet',
    description: 'Add your Solana or EVM wallet address to start importing trades.',
    href: '/wallet-management',
    icon: Wallet,
  },
  {
    key: 'timezone',
    label: 'Set your timezone',
    description: 'Configure your timezone and trading start time for accurate daily tracking.',
    href: '/settings',
    icon: Globe,
  },
  {
    key: 'strategy',
    label: 'Create a strategy',
    description: 'Define your first trading strategy with entry/exit rules to track discipline.',
    href: '/strategies',
    icon: BookOpen,
  },
  {
    key: 'presession',
    label: 'Complete your first pre-session',
    description: 'Start your trading day with a pre-session checklist to set intentions.',
    href: '/diary/pre-session',
    icon: ClipboardList,
  },
] as const

export function GettingStarted({ hasWallets, hasTimezone, hasStrategies, preSessionDone }: GettingStartedProps) {
  const completionMap: Record<string, boolean> = {
    wallet: hasWallets,
    timezone: hasTimezone,
    strategy: hasStrategies,
    presession: preSessionDone,
  }

  const completedCount = Object.values(completionMap).filter(Boolean).length
  const allDone = completedCount === steps.length

  if (allDone) return null

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Getting Started</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Complete these steps to get the most out of Journalio.
          </p>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {completedCount}/{steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted mb-5">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {steps.map((step) => {
          const done = completionMap[step.key]
          const Icon = step.icon
          return (
            <Link
              key={step.key}
              href={done ? '#' : step.href}
              className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                done
                  ? 'bg-muted/30 border-border/50 opacity-60'
                  : 'hover:bg-muted/50 border-border'
              }`}
            >
              <div className="mt-0.5">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                    {step.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
