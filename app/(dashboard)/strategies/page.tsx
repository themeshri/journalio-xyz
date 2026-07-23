'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StrategyCardSkeleton } from '@/components/skeletons'
import {
  type Strategy,
  type StrategyRule,
  type RuleGroup,
  loadStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
} from '@/lib/strategies'
import {
  type GlobalRule,
  RULE_TYPE_META,
  loadRules,
  createRule,
  updateRule,
  deleteRule,
} from '@/lib/rules'
import { useWallet } from '@/lib/wallet-context'
import { safeLocalStorage } from '@/lib/local-storage'
import { DEFAULT_TYPED_RULES, type RuleType } from '@/lib/rules-engine'
import { STRATEGY_TEMPLATES, type StrategyTemplate } from '@/lib/strategy-templates'
import { toast } from 'sonner'

// ─── Constants ────────────────────────────────────────────────

const PRESET_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

const PRESET_ICONS = ['🚀', '🎯', '📊', '🔄', '💎', '⚡', '🔥', '🧠', '🦈', '🐂', '🎲', '🛡️']

/** Soft cap shown inline next to the heading. Not enforced server-side. */
const MAX_STRATEGIES = 10

// Templates now live in the DB as Strategy rows with isTemplate = true
// (seeded by scripts/seed-strategy-templates.ts). STRATEGY_TEMPLATES is the
// bundled fallback for a database that has not been seeded yet.


// ─── Form Helpers ─────────────────────────────────────────────

function createBlankGroup(sortOrder: number): RuleGroup {
  return {
    id: crypto.randomUUID(),
    name: '',
    rules: [],
    sortOrder,
  }
}

function createBlankRule(sortOrder: number): StrategyRule {
  return {
    id: crypto.randomUUID(),
    text: '',
    isRequired: true,
    showWhen: 'always',
    sortOrder,
  }
}

// ─── Sub-Components ───────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-8 h-8 rounded-md border-2 border-border shrink-0"
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-7 h-7 rounded-md transition-transform ${c === value ? 'ring-2 ring-offset-2 ring-ring scale-110' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => onChange(c)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function IconPicker({ value, onChange }: { value: string; onChange: (i: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-8 h-8 rounded-md border-2 border-border shrink-0 flex items-center justify-center text-lg"
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          {PRESET_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              className={`w-8 h-8 rounded-md flex items-center justify-center text-lg transition-transform hover:bg-accent ${ic === value ? 'ring-2 ring-ring bg-accent scale-110' : ''}`}
              onClick={() => onChange(ic)}
            >
              {ic}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function RuleEditor({
  rule,
  onUpdate,
  onRemove,
}: {
  rule: StrategyRule
  onUpdate: (r: StrategyRule) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 space-y-1.5">
        <div className="flex gap-2">
          <Input
            value={rule.text}
            onChange={(e) => onUpdate({ ...rule, text: e.target.value })}
            placeholder="Rule description..."
            className="text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="shrink-0 px-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            X
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={rule.isRequired}
              onCheckedChange={(checked) => onUpdate({ ...rule, isRequired: !!checked })}
            />
            <span className="text-muted-foreground">Required</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Show:</span>
            <Select
              value={rule.showWhen}
              onValueChange={(v) => onUpdate({ ...rule, showWhen: v as StrategyRule['showWhen'] })}
            >
              <SelectTrigger className="h-6 text-xs w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always</SelectItem>
                <SelectItem value="winner">Winner</SelectItem>
                <SelectItem value="loser">Loser</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

function RuleGroupEditor({
  group,
  onUpdate,
  onRemove,
}: {
  group: RuleGroup
  onUpdate: (g: RuleGroup) => void
  onRemove: () => void
}) {
  function updateGroupRule(ruleId: string, updated: StrategyRule) {
    onUpdate({
      ...group,
      rules: group.rules.map((r) => (r.id === ruleId ? updated : r)),
    })
  }

  function removeGroupRule(ruleId: string) {
    onUpdate({
      ...group,
      rules: group.rules.filter((r) => r.id !== ruleId),
    })
  }

  function addGroupRule() {
    onUpdate({
      ...group,
      rules: [...group.rules, createBlankRule(group.rules.length)],
    })
  }

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={group.name}
          onChange={(e) => onUpdate({ ...group, name: e.target.value })}
          placeholder="Group name (e.g., Entry Criteria)"
          className="text-sm font-medium"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
        >
          Remove Group
        </Button>
      </div>

      <div className="space-y-2 pl-2">
        {group.rules.map((rule) => (
          <RuleEditor
            key={rule.id}
            rule={rule}
            onUpdate={(r) => updateGroupRule(rule.id, r)}
            onRemove={() => removeGroupRule(rule.id)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addGroupRule}
        className="text-xs text-muted-foreground"
      >
        + Add Rule
      </Button>
    </div>
  )
}

function TemplateSelector({
  templates,
  onSelect,
}: {
  templates: StrategyTemplate[]
  onSelect: (t: StrategyTemplate) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-xs">
          Use Template
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.name}
              type="button"
              className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => {
                onSelect(t)
                setOpen(false)
              }}
            >
              <div className="flex items-center gap-2">
                <span>{t.icon}</span>
                <span className="text-sm font-medium">{t.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Strategy Card (Read View) ────────────────────────────────

function StrategyCard({
  strategy,
  onEdit,
  onArchive,
  onRequestDelete,
  disabled,
  advancedMode,
}: {
  strategy: Strategy
  onEdit: () => void
  onArchive: () => void
  onRequestDelete: () => void
  disabled: boolean
  advancedMode: boolean
}) {
  const totalRules = strategy.ruleGroups.reduce((acc, g) => acc + g.rules.length, 0)
  const requiredRules = strategy.ruleGroups.reduce(
    (acc, g) => acc + g.rules.filter((r) => r.isRequired).length,
    0
  )

  return (
    <div
      className={`border rounded-lg p-4 transition-opacity ${strategy.isArchived ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: strategy.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{strategy.icon}</span>
          <h3 className="text-sm font-semibold">{strategy.name}</h3>
          {strategy.isArchived && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Archived
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onArchive}
          >
            {strategy.isArchived ? 'Restore' : 'Archive'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onEdit}
            disabled={disabled}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={onRequestDelete}
            disabled={disabled}
          >
            Delete
          </Button>
        </div>
      </div>

      {strategy.description && (
        <p className="text-xs text-muted-foreground mb-2">{strategy.description}</p>
      )}

      {advancedMode && (
        <>
          <div className="text-xs text-muted-foreground mb-2">
            {strategy.ruleGroups.length} group{strategy.ruleGroups.length !== 1 ? 's' : ''},{' '}
            {totalRules} rule{totalRules !== 1 ? 's' : ''} ({requiredRules} required)
          </div>

          <Accordion type="multiple" className="w-full">
            {strategy.ruleGroups
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((group) => (
                <AccordionItem key={group.id} value={group.id} className="border-b-0">
                  <AccordionTrigger className="py-1.5 text-xs font-medium text-muted-foreground hover:no-underline">
                    {group.name} ({group.rules.length})
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <ul className="space-y-0.5">
                      {group.rules
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((rule) => (
                          <li key={rule.id} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className={`mt-0.5 ${rule.isRequired ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                              {rule.isRequired ? '●' : '○'}
                            </span>
                            <span>
                              {rule.text}
                              {!rule.isRequired && (
                                <span className="text-muted-foreground/50 ml-1">(optional)</span>
                              )}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function StrategiesPage() {
  const { reloadStrategies: reloadCtxStrategies } = useWallet()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [rules, setRules] = useState<GlobalRule[]>([])
  const [templates, setTemplates] = useState<StrategyTemplate[]>(STRATEGY_TEMPLATES)
  const [loaded, setLoaded] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(() => {
    return safeLocalStorage.getItem<boolean>('journalio_strategies_advanced', false)
  })

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])
  const [formIcon, setFormIcon] = useState('🚀')
  const [formGroups, setFormGroups] = useState<RuleGroup[]>([])
  const [formDirty, setFormDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Delete confirm state
  const [deleteStrategyId, setDeleteStrategyId] = useState<string | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

  // Rule form state
  const [newRule, setNewRule] = useState('')
  const [newRuleType, setNewRuleType] = useState<RuleType>('manual')
  const [newRuleCondition, setNewRuleCondition] = useState('')
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingRuleText, setEditingRuleText] = useState('')
  const [editingRuleType, setEditingRuleType] = useState<RuleType>('manual')
  const [editingRuleCondition, setEditingRuleCondition] = useState('')

  useEffect(() => {
    Promise.all([loadStrategies(true), loadRules()]).then(([strats, loadedRules]) => {
      setStrategies(strats)
      setRules(loadedRules)
      setLoaded(true)
    })
  }, [])

  // Templates come from the DB; the bundled STRATEGY_TEMPLATES stay as the
  // initial value so an unseeded database still shows something useful.
  useEffect(() => {
    let stale = false
    fetch('/api/strategies?templates=true')
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: Strategy[] | null) => {
        if (stale || !rows?.length) return
        setTemplates(
          rows.map((r) => ({
            name: r.name,
            description: r.description,
            icon: r.icon,
            color: r.color,
            ruleGroups: r.ruleGroups,
          }))
        )
      })
      .catch(() => {
        // Keep the bundled fallback.
      })
    return () => {
      stale = true
    }
  }, [])

  // ─── Strategy CRUD ──────────────────────────────────────────

  function openAdd() {
    if (showForm && formDirty && !window.confirm('You have unsaved changes. Discard them?')) return
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormColor(PRESET_COLORS[0])
    setFormIcon('🚀')
    setFormGroups([])
    setFormDirty(false)
    setShowForm(true)
  }

  function openEdit(s: Strategy) {
    if (showForm && formDirty && !window.confirm('You have unsaved changes. Discard them?')) return
    setEditingId(s.id)
    setFormName(s.name)
    setFormDescription(s.description)
    setFormColor(s.color)
    setFormIcon(s.icon)
    setFormGroups(JSON.parse(JSON.stringify(s.ruleGroups)))
    setFormDirty(false)
    setShowForm(true)
  }

  function cancelForm() {
    if (formDirty && !window.confirm('You have unsaved changes. Discard them?')) return
    setShowForm(false)
    setEditingId(null)
    setFormDirty(false)
  }

  function applyTemplate(t: StrategyTemplate) {
    setFormName(t.name)
    setFormDescription(t.description)
    setFormColor(t.color)
    setFormIcon(t.icon)
    setFormGroups(
      t.ruleGroups.map((g) => ({
        ...g,
        id: crypto.randomUUID(),
        rules: g.rules.map((r) => ({ ...r, id: crypto.randomUUID() })),
      }))
    )
  }

  async function handleSave() {
    const name = formName.trim()
    if (!name) return

    setSaving(true)
    try {
      const cleanGroups = formGroups
        .map((g) => ({
          ...g,
          name: g.name.trim() || 'Untitled Group',
          rules: g.rules.filter((r) => r.text.trim()),
        }))
        .filter((g) => g.rules.length > 0)

      if (editingId) {
        const updated = await updateStrategy(editingId, {
          name,
          description: formDescription.trim(),
          color: formColor,
          icon: formIcon,
          ruleGroups: cleanGroups,
        })
        if (updated) {
          setStrategies((prev) => prev.map((s) => (s.id === editingId ? updated : s)))
          reloadCtxStrategies()
          toast.success('Strategy updated')
        } else {
          toast.error('Failed to update strategy')
        }
      } else {
        const created = await createStrategy({
          name,
          description: formDescription.trim(),
          color: formColor,
          icon: formIcon,
          ruleGroups: cleanGroups,
        })
        if (created) {
          setStrategies((prev) => [...prev, created])
          reloadCtxStrategies()
          toast.success('Strategy created')
        } else {
          toast.error('Failed to create strategy')
        }
      }
      setFormDirty(false)
      cancelForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await deleteStrategy(id)
    if (ok) {
      setStrategies((prev) => prev.filter((s) => s.id !== id))
      reloadCtxStrategies()
      toast.success('Strategy deleted')
    } else {
      toast.error('Failed to delete strategy')
    }
    setDeleteStrategyId(null)
  }

  async function toggleArchive(id: string) {
    const s = strategies.find((x) => x.id === id)
    if (!s) return
    const updated = await updateStrategy(id, { isArchived: !s.isArchived })
    if (updated) {
      setStrategies((prev) => prev.map((x) => (x.id === id ? updated : x)))
      reloadCtxStrategies()
      toast.success(updated.isArchived ? 'Strategy archived' : 'Strategy restored')
    } else {
      toast.error('Failed to update strategy')
    }
  }

  // ─── Group Editing ──────────────────────────────────────────

  function addGroup() {
    setFormGroups([...formGroups, createBlankGroup(formGroups.length)])
    setFormDirty(true)
  }

  function updateFormGroup(groupId: string, updated: RuleGroup) {
    setFormGroups(formGroups.map((g) => (g.id === groupId ? updated : g)))
    setFormDirty(true)
  }

  function removeGroup(groupId: string) {
    setFormGroups(formGroups.filter((g) => g.id !== groupId))
    setFormDirty(true)
  }

  // ─── Global Rule CRUD ──────────────────────────────────────

  async function handleAddRule() {
    const text = newRule.trim()
    if (!text) return
    // A typed rule without a condition has nothing to measure against, so it
    // would silently never evaluate — block it rather than store a dud.
    if (newRuleType !== 'manual' && !newRuleCondition.trim()) {
      toast.error('This rule type needs a target value')
      return
    }
    const created = await createRule(text, {
      type: newRuleType,
      condition: newRuleCondition.trim(),
    })
    if (created) {
      setRules((prev) => [...prev, created])
      setNewRule('')
      setNewRuleType('manual')
      setNewRuleCondition('')
      toast.success('Rule added')
    } else {
      toast.error('Failed to add rule')
    }
  }

  async function handleDeleteRule(id: string) {
    const ok = await deleteRule(id)
    if (ok) {
      setRules((prev) => prev.filter((r) => r.id !== id))
      toast.success('Rule deleted')
    } else {
      toast.error('Failed to delete rule')
    }
    setDeleteRuleId(null)
  }

  function startEditRule(rule: GlobalRule) {
    setEditingRuleId(rule.id)
    setEditingRuleText(rule.text)
    setEditingRuleType(rule.type ?? 'manual')
    setEditingRuleCondition(rule.condition ?? '')
  }

  async function saveEditRule() {
    if (!editingRuleId) return
    const text = editingRuleText.trim()
    if (!text) return
    if (editingRuleType !== 'manual' && !editingRuleCondition.trim()) {
      toast.error('This rule type needs a target value')
      return
    }
    const updated = await updateRule(editingRuleId, {
      text,
      type: editingRuleType,
      condition: editingRuleCondition.trim(),
    })
    if (updated) {
      setRules((prev) => prev.map((r) => (r.id === editingRuleId ? updated : r)))
      toast.success('Rule updated')
    } else {
      toast.error('Failed to update rule')
    }
    cancelEditRule()
  }

  function cancelEditRule() {
    setEditingRuleId(null)
    setEditingRuleText('')
    setEditingRuleType('manual')
    setEditingRuleCondition('')
  }

  /** Seed the five defaults from docs §3.8 for a user with no rules yet. */
  async function handleSeedDefaultRules() {
    const created: GlobalRule[] = []
    for (const r of DEFAULT_TYPED_RULES) {
      const rule = await createRule(r.text, { type: r.type, condition: r.condition })
      if (rule) created.push(rule)
    }
    if (created.length > 0) {
      setRules((prev) => [...prev, ...created])
      toast.success(`Added ${created.length} starter rules`)
    } else {
      toast.error('Failed to add starter rules')
    }
  }

  // ─── Render ─────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div className="max-w-2xl pt-8">
        <h1 className="text-xl font-semibold mb-6">Strategies</h1>
        <div className="space-y-3">
          <StrategyCardSkeleton />
          <StrategyCardSkeleton />
        </div>
      </div>
    )
  }

  const activeStrategies = strategies.filter((s) => !s.isArchived)
  const archivedStrategies = strategies.filter((s) => s.isArchived)

  return (
    <div className="max-w-2xl">
      {/* ========== STRATEGIES SECTION ========== */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold">Strategies</h1>
            {/* Quota surfaced inline (docs §5) — sets expectations early. */}
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {activeStrategies.length}/{MAX_STRATEGIES}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define trading strategies with organized rule groups and checklists
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground" title="Show archive, icon/color picker, and rule ordering options">
            <span>Advanced</span>
            <button
              type="button"
              role="switch"
              aria-checked={advancedMode}
              onClick={() => {
                const next = !advancedMode
                setAdvancedMode(next)
                safeLocalStorage.setItem('journalio_strategies_advanced', next)
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                advancedMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${
                  advancedMode ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
          {!showForm && (
            <Button size="sm" onClick={openAdd}>
              + New Strategy
            </Button>
          )}
        </div>
      </div>

      {/* ── Strategy Form ── */}
      {showForm && (
        <div className="mb-6 border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editingId ? 'Edit Strategy' : 'New Strategy'}</h2>
            <TemplateSelector templates={templates} onSelect={applyTemplate} />
          </div>

          <div className="flex items-center gap-3">
            <IconPicker value={formIcon} onChange={setFormIcon} />
            <ColorPicker value={formColor} onChange={setFormColor} />
            <Input
              value={formName}
              onChange={(e) => { setFormName(e.target.value); setFormDirty(true) }}
              placeholder="Strategy name"
              className="flex-1"
            />
          </div>

          <Textarea
            value={formDescription}
            onChange={(e) => { setFormDescription(e.target.value); setFormDirty(true) }}
            placeholder="Brief description of this strategy..."
            rows={2}
            className="resize-none"
          />

          {advancedMode && (
            <>
              <Separator />

              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Rule Groups</Label>
                <div className="space-y-3">
                  {formGroups.map((group) => (
                    <RuleGroupEditor
                      key={group.id}
                      group={group}
                      onUpdate={(g) => updateFormGroup(group.id, g)}
                      onRemove={() => removeGroup(group.id)}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addGroup}
                  className="mt-3 text-xs"
                >
                  + Add Rule Group
                </Button>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={!formName.trim() || saving}>
              {saving ? 'Saving...' : editingId ? 'Update Strategy' : 'Save Strategy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {strategies.length === 0 && !showForm && (
        <div className="border border-dashed rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            No strategies yet. Create your own or start from a template.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {templates.map((t) => (
              <button
                key={t.name}
                onClick={() => { openAdd(); applyTemplate(t) }}
                className="flex items-start gap-3 rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="text-center">
            <Button size="sm" variant="outline" onClick={openAdd}>
              + Blank Strategy
            </Button>
          </div>
        </div>
      )}

      {/* ── Active Strategies ── */}
      <div className="space-y-3">
        {activeStrategies.map((s) => (
          <StrategyCard
            key={s.id}
            strategy={s}
            onEdit={() => openEdit(s)}
            onArchive={() => toggleArchive(s.id)}
            onRequestDelete={() => setDeleteStrategyId(s.id)}
            disabled={showForm}
            advancedMode={advancedMode}
          />
        ))}
      </div>

      {/* ── Archived Strategies ── */}
      {archivedStrategies.length > 0 && (
        <>
          <Separator className="my-6" />
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Archived ({archivedStrategies.length})
          </h2>
          <div className="space-y-3">
            {archivedStrategies.map((s) => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onEdit={() => openEdit(s)}
                onArchive={() => toggleArchive(s.id)}
                onRequestDelete={() => setDeleteStrategyId(s.id)}
                disabled={showForm}
                advancedMode={advancedMode}
              />
            ))}
          </div>
        </>
      )}

      {/* ========== GLOBAL RULES SECTION ========== */}
      <Separator className="my-8" />

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Global Rules</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Trading rules that apply across all strategies. These show up in your pre-session checklist.
        </p>
      </div>

      <div className="mb-1 flex gap-2">
        <Input
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          placeholder="e.g., I will not chase pumps that already 5x'd"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddRule()
          }}
        />
        <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as RuleType)}>
          <SelectTrigger className="w-[172px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(RULE_TYPE_META) as RuleType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {RULE_TYPE_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {newRuleType !== 'manual' && (
          <Input
            value={newRuleCondition}
            onChange={(e) => setNewRuleCondition(e.target.value)}
            placeholder={RULE_TYPE_META[newRuleType].placeholder}
            className="w-24 shrink-0 font-mono"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddRule()
            }}
          />
        )}
        <Button size="sm" onClick={handleAddRule} disabled={!newRule.trim()}>
          Add
        </Button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {RULE_TYPE_META[newRuleType].hint}
      </p>

      {rules.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No rules yet. Add rules you want to acknowledge before every session.
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Typed rules are scored automatically each trading day and tracked with a
            streak and follow rate on the Progress Tracker.
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={handleSeedDefaultRules}>
            Add 5 starter rules
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md border"
            >
              {editingRuleId === rule.id ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    value={editingRuleText}
                    onChange={(e) => setEditingRuleText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditRule()
                      if (e.key === 'Escape') cancelEditRule()
                    }}
                    autoFocus
                  />
                  <Select
                    value={editingRuleType}
                    onValueChange={(v) => setEditingRuleType(v as RuleType)}
                  >
                    <SelectTrigger className="w-[172px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RULE_TYPE_META) as RuleType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {RULE_TYPE_META[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingRuleType !== 'manual' && (
                    <Input
                      value={editingRuleCondition}
                      onChange={(e) => setEditingRuleCondition(e.target.value)}
                      placeholder={RULE_TYPE_META[editingRuleType].placeholder}
                      className="w-24 shrink-0 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditRule()
                        if (e.key === 'Escape') cancelEditRule()
                      }}
                    />
                  )}
                  <Button size="sm" onClick={saveEditRule} disabled={!editingRuleText.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditRule}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm flex-1">{rule.text}</span>
                  {rule.type && rule.type !== 'manual' && (
                    <span
                      className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
                      title={`Auto-scored: ${RULE_TYPE_META[rule.type].label}`}
                    >
                      {rule.condition}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => startEditRule(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteRuleId(rule.id)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Strategy Confirmation ── */}
      <AlertDialog open={!!deleteStrategyId} onOpenChange={(open) => !open && setDeleteStrategyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this strategy?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The strategy and all its rules will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteStrategyId) handleDelete(deleteStrategyId) }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Rule Confirmation ── */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>This rule will be permanently removed from your global rules list.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteRuleId) handleDeleteRule(deleteRuleId) }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
