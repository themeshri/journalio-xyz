'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  SlidersHorizontal,
  Tag,
  CalendarClock,
  BookOpen,
  ChevronRight,
} from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useMetadata } from '@/lib/wallet-context'

/**
 * The global trade filter.
 *
 * Reworked into a TradeZella-style two-pane categorized panel (docs §1):
 * categories on the left, that category's options on the right, and a batched
 * Reset / Cancel / Apply footer — changes stage in local `draft` state and only
 * commit to the URL on Apply, so a multi-select doesn't spray one history entry
 * per toggle.
 *
 * The URL remains the single source of truth via the same param names that
 * `lib/trade-filters.ts` parses (outcome / month / day / search / minPl / maxPl
 * / lastN / strategyId / tags / minRating / reviewed). The filter *engine*
 * already honours every one of these; this component just exposes them.
 */

const OUTCOME_OPTIONS = [
  { value: 'all', label: 'All Outcomes' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'breakeven', label: 'Break Even' },
]

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  ...['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(
    (label, i) => ({ value: String(i), label })
  ),
]

const DAY_OPTIONS = [
  { value: 'all', label: 'All Days' },
  ...['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
    (label, i) => ({ value: String(i), label })
  ),
]

const RATING_OPTIONS = [
  { value: 'all', label: 'Any rating' },
  { value: '5', label: '5 stars' },
  { value: '4', label: '4+ stars' },
  { value: '3', label: '3+ stars' },
  { value: '2', label: '2+ stars' },
  { value: '1', label: '1+ stars' },
]

const REVIEWED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'true', label: 'Reviewed' },
  { value: 'false', label: 'Unreviewed' },
]

/** The filter params this bar owns. Everything else in the URL is left alone. */
const OWNED_KEYS = [
  'outcome', 'month', 'day', 'search', 'minPl', 'maxPl', 'lastN',
  'strategyId', 'tags', 'minRating', 'reviewed',
] as const

type Draft = Record<string, string>

const CATEGORIES = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'daytime', label: 'Day & Time', icon: CalendarClock },
  { id: 'strategy', label: 'Strategy', icon: BookOpen },
] as const
type CategoryId = (typeof CATEGORIES)[number]['id']

/** Read the bar's owned params out of the URL into a flat draft object. */
function draftFromParams(params: URLSearchParams): Draft {
  const d: Draft = {}
  for (const k of OWNED_KEYS) {
    const v = params.get(k)
    if (v !== null) d[k] = v
  }
  return d
}

/** Count active filters in a draft, grouping min/max P&L as one. */
function countActive(d: Draft): number {
  return [
    d.outcome, d.month, d.day, d.search,
    d.minPl || d.maxPl, d.lastN,
    d.strategyId, d.tags, d.minRating, d.reviewed,
  ].filter(Boolean).length
}

export function GlobalFilterBar() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { strategies, tags } = useMetadata()

  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<CategoryId>('general')
  const [draft, setDraft] = useState<Draft>({})
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // The committed (URL) state drives the trigger badge; the draft drives the panel.
  const committedCount = useMemo(
    () => countActive(draftFromParams(new URLSearchParams(searchParams.toString()))),
    [searchParams]
  )
  const draftCount = countActive(draft)

  const mistakeTags = useMemo(() => tags.filter((t) => t.kind === 'mistake' && !t.isArchived), [tags])
  const customTags = useMemo(() => tags.filter((t) => t.kind === 'custom' && !t.isArchived), [tags])
  const selectedTagIds = useMemo(
    () => new Set((draft.tags || '').split(',').filter(Boolean)),
    [draft.tags]
  )

  // Seed the draft from the URL each time the panel opens, so a discarded edit
  // (Cancel, or click-away) never leaks and re-opening shows committed truth.
  function openPanel() {
    setDraft(draftFromParams(new URLSearchParams(searchParams.toString())))
    setCategory('general')
    setOpen(true)
  }

  // Close (discarding the draft) on click-outside / Escape.
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function set(key: string, value: string) {
    setDraft((prev) => {
      const next = { ...prev }
      if (value === '' || value === 'all') delete next[key]
      else next[key] = value
      return next
    })
  }

  function toggleTag(id: string) {
    const next = new Set(selectedTagIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    set('tags', Array.from(next).join(','))
  }

  function apply() {
    const params = new URLSearchParams(searchParams.toString())
    for (const k of OWNED_KEYS) params.delete(k)
    for (const [k, v] of Object.entries(draft)) {
      if (v !== '' && v !== 'all') params.set(k, v)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    setOpen(false)
  }

  function resetAll() {
    setDraft({})
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {committedCount > 0 && (
          <span
            className="ml-0.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 leading-none font-medium"
            aria-label={`${committedCount} active filter${committedCount !== 1 ? 's' : ''}`}
          >
            {committedCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-[560px] rounded-md border bg-popover shadow-md">
          <div className="flex">
            {/* Left: category rail */}
            <div className="w-40 shrink-0 border-r p-1.5 space-y-0.5">
              {CATEGORIES.map((c) => {
                const Icon = c.icon
                const active = category === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs transition-colors ${
                      active ? 'bg-muted font-medium' : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1 text-left">{c.label}</span>
                    {active && <ChevronRight className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>

            {/* Right: options for the active category */}
            <div className="flex-1 p-3 min-h-[240px] space-y-3">
              {category === 'general' && (
                <>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search token or mint..."
                      value={draft.search || ''}
                      onChange={(e) => set('search', e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <LabeledSelect label="Outcome" value={draft.outcome || 'all'} options={OUTCOME_OPTIONS} onChange={(v) => set('outcome', v)} />
                    <LabeledSelect label="Trade rating" value={draft.minRating || 'all'} options={RATING_OPTIONS} onChange={(v) => set('minRating', v)} />
                    <LabeledSelect label="Reviewed" value={draft.reviewed || 'all'} options={REVIEWED_OPTIONS} onChange={(v) => set('reviewed', v)} />
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Last N trades</p>
                      <Input type="number" placeholder="e.g. 50" value={draft.lastN || ''} onChange={(e) => set('lastN', e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">P/L range ($)</p>
                    <div className="flex items-center gap-1.5">
                      <Input type="number" placeholder="Min" value={draft.minPl || ''} onChange={(e) => set('minPl', e.target.value)} className="h-8 text-xs" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input type="number" placeholder="Max" value={draft.maxPl || ''} onChange={(e) => set('maxPl', e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </>
              )}

              {category === 'tags' && (
                <>
                  <TagGroup title="Mistakes" tags={mistakeTags} selected={selectedTagIds} onToggle={toggleTag} empty="No mistake tags yet." />
                  <TagGroup title="Custom" tags={customTags} selected={selectedTagIds} onToggle={toggleTag} empty="No custom tags yet." />
                  <p className="text-[10px] text-muted-foreground pt-1">Matches trades carrying any selected tag.</p>
                </>
              )}

              {category === 'daytime' && (
                <div className="grid grid-cols-2 gap-2">
                  <LabeledSelect label="Month" value={draft.month || 'all'} options={MONTH_OPTIONS} onChange={(v) => set('month', v)} />
                  <LabeledSelect label="Day of week" value={draft.day || 'all'} options={DAY_OPTIONS} onChange={(v) => set('day', v)} />
                </div>
              )}

              {category === 'strategy' && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Strategy</p>
                  {strategies.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No strategies yet.</p>
                  ) : (
                    <Select value={draft.strategyId || 'all'} onValueChange={(v) => set('strategyId', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any strategy</SelectItem>
                        {strategies.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer: batched Reset / Cancel / Apply */}
          <div className="flex items-center justify-between border-t px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground disabled:opacity-40"
              onClick={resetAll}
              disabled={draftCount === 0}
            >
              Reset all
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={apply}>
                Apply{draftCount > 0 ? ` (${draftCount})` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LabeledSelect({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function TagGroup({
  title, tags, selected, onToggle, empty,
}: {
  title: string
  tags: { id: string; label: string; color: string }[]
  selected: Set<string>
  onToggle: (id: string) => void
  empty: string
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
      {tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const on = selected.has(t.id)
            return (
              <button
                key={t.id}
                onClick={() => onToggle(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${
                  on ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted/50'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
