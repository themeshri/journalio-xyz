'use client'

import { useState, useEffect, useCallback } from 'react'
import { safeLocalStorage } from '@/lib/local-storage'
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
import { StrategyCardSkeleton } from '@/components/skeletons'
import {
  type Strategy,
  type StrategyRule,
  type RuleGroup,
  loadStrategies,
  saveStrategies,
} from '@/lib/strategies'

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

// ─── Templates ────────────────────────────────────────────────

interface StrategyTemplate {
  name: string
  description: string
  icon: string
  color: string
  ruleGroups: Omit<RuleGroup, 'id'>[]
}

const TEMPLATES: StrategyTemplate[] = [
  {
    name: 'Solana Momentum',
    description: 'High-volume meme plays with strong social buzz',
    icon: '🚀',
    color: '#10b981',
    ruleGroups: [
      {
        name: 'Entry Criteria',
        sortOrder: 0,
        rules: [
          { id: '', text: 'Token has strong social buzz (CT/Telegram mentions)', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Volume spike detected (>2x normal)', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Market cap in my target range', isRequired: true, showWhen: 'always', sortOrder: 2 },
          { id: '', text: 'Not a copy/fork of an existing token', isRequired: false, showWhen: 'always', sortOrder: 3 },
        ],
      },
      {
        name: 'Exit Criteria',
        sortOrder: 1,
        rules: [
          { id: '', text: 'Hit take-profit target (2x-5x)', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Volume dying / momentum fading', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Dev wallet dumping / insider selling', isRequired: true, showWhen: 'always', sortOrder: 2 },
        ],
      },
      {
        name: 'Risk Parameters',
        sortOrder: 2,
        rules: [
          { id: '', text: 'Position size within my limits', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Not already overexposed to this narrative', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Stop loss plan defined before entry', isRequired: true, showWhen: 'always', sortOrder: 2 },
        ],
      },
      {
        name: 'Market Conditions',
        sortOrder: 3,
        rules: [
          { id: '', text: 'SOL trending up or stable', isRequired: false, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'No major FUD events ongoing', isRequired: false, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Not trading during low-liquidity hours', isRequired: false, showWhen: 'always', sortOrder: 2 },
        ],
      },
    ],
  },
  {
    name: 'Sniper Entry',
    description: 'Fresh deployments with quick scalp targets',
    icon: '🎯',
    color: '#f59e0b',
    ruleGroups: [
      {
        name: 'Entry Criteria',
        sortOrder: 0,
        rules: [
          { id: '', text: 'Fresh deployment (< 1 hour old)', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Liquidity locked or burned', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Contract verified / no honeypot flags', isRequired: true, showWhen: 'always', sortOrder: 2 },
          { id: '', text: 'Social accounts created (Twitter/Telegram)', isRequired: false, showWhen: 'always', sortOrder: 3 },
        ],
      },
      {
        name: 'Exit Criteria',
        sortOrder: 1,
        rules: [
          { id: '', text: 'Quick 2-3x scalp target', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Exit if no movement in 15 min', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
      {
        name: 'Risk Parameters',
        sortOrder: 2,
        rules: [
          { id: '', text: 'Max loss: predetermined amount', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Small position (1-2% of portfolio)', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
    ],
  },
  {
    name: 'Swing / Narrative Play',
    description: 'Catalyst-driven trades held for 1-7 days',
    icon: '📊',
    color: '#8b5cf6',
    ruleGroups: [
      {
        name: 'Entry Criteria',
        sortOrder: 0,
        rules: [
          { id: '', text: 'Clear narrative/catalyst identified', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Token survived initial pump/dump cycle', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Building higher lows on chart', isRequired: true, showWhen: 'always', sortOrder: 2 },
          { id: '', text: 'Community active and growing', isRequired: false, showWhen: 'always', sortOrder: 3 },
        ],
      },
      {
        name: 'Exit Criteria',
        sortOrder: 1,
        rules: [
          { id: '', text: 'Narrative plays out / catalyst happens', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Scale out in chunks (25% at each target)', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
      {
        name: 'Risk Parameters',
        sortOrder: 2,
        rules: [
          { id: '', text: 'Comfortable holding for 1-7 days', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Position size accounts for volatility', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
    ],
  },
]

// ─── Global Rules (kept for pre-session compat) ───────────────

interface GlobalRule {
  id: string
  text: string
}

const RULES_KEY = 'journalio_rules'

function loadRules(): GlobalRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRules(rules: GlobalRule[]) {
  safeLocalStorage.setItem(RULES_KEY, rules)
}

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
  function updateRule(ruleId: string, updated: StrategyRule) {
    onUpdate({
      ...group,
      rules: group.rules.map((r) => (r.id === ruleId ? updated : r)),
    })
  }

  function removeRule(ruleId: string) {
    onUpdate({
      ...group,
      rules: group.rules.filter((r) => r.id !== ruleId),
    })
  }

  function addRule() {
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
            onUpdate={(r) => updateRule(rule.id, r)}
            onRemove={() => removeRule(rule.id)}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addRule}
        className="text-xs text-muted-foreground"
      >
        + Add Rule
      </Button>
    </div>
  )
}

function TemplateSelector({ onSelect }: { onSelect: (t: StrategyTemplate) => void }) {
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
          {TEMPLATES.map((t) => (
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
  onDelete,
  disabled,
}: {
  strategy: Strategy
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  disabled: boolean
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
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
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive"
                onClick={onDelete}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteConfirm(true)}
              disabled={disabled}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {strategy.description && (
        <p className="text-xs text-muted-foreground mb-2">{strategy.description}</p>
      )}

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
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [rules, setRules] = useState<GlobalRule[]>([])
  const [loaded, setLoaded] = useState(false)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formColor, setFormColor] = useState(PRESET_COLORS[0])
  const [formIcon, setFormIcon] = useState('🚀')
  const [formGroups, setFormGroups] = useState<RuleGroup[]>([])

  // Rule form state
  const [newRule, setNewRule] = useState('')
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingRuleText, setEditingRuleText] = useState('')
  const [deleteRuleConfirm, setDeleteRuleConfirm] = useState<string | null>(null)

  useEffect(() => {
    setStrategies(loadStrategies())
    setRules(loadRules())
    setLoaded(true)
  }, [])

  const persistStrategies = useCallback((updated: Strategy[]) => {
    setStrategies(updated)
    saveStrategies(updated)
  }, [])

  const persistRules = useCallback((updated: GlobalRule[]) => {
    setRules(updated)
    saveRules(updated)
  }, [])

  // ─── Strategy CRUD ──────────────────────────────────────────

  function openAdd() {
    setEditingId(null)
    setFormName('')
    setFormDescription('')
    setFormColor(PRESET_COLORS[0])
    setFormIcon('🚀')
    setFormGroups([])
    setShowForm(true)
  }

  function openEdit(s: Strategy) {
    setEditingId(s.id)
    setFormName(s.name)
    setFormDescription(s.description)
    setFormColor(s.color)
    setFormIcon(s.icon)
    setFormGroups(JSON.parse(JSON.stringify(s.ruleGroups)))
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
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

  function handleSave() {
    const name = formName.trim()
    if (!name) return

    const cleanGroups = formGroups
      .map((g) => ({
        ...g,
        name: g.name.trim() || 'Untitled Group',
        rules: g.rules.filter((r) => r.text.trim()),
      }))
      .filter((g) => g.rules.length > 0)

    const now = new Date().toISOString()

    if (editingId) {
      persistStrategies(
        strategies.map((s) =>
          s.id === editingId
            ? { ...s, name, description: formDescription.trim(), color: formColor, icon: formIcon, ruleGroups: cleanGroups, updatedAt: now }
            : s
        )
      )
    } else {
      const newStrategy: Strategy = {
        id: crypto.randomUUID(),
        name,
        description: formDescription.trim(),
        color: formColor,
        icon: formIcon,
        ruleGroups: cleanGroups,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      }
      persistStrategies([...strategies, newStrategy])
    }
    cancelForm()
  }

  function handleDelete(id: string) {
    persistStrategies(strategies.filter((s) => s.id !== id))
  }

  function toggleArchive(id: string) {
    persistStrategies(
      strategies.map((s) => (s.id === id ? { ...s, isArchived: !s.isArchived, updatedAt: new Date().toISOString() } : s))
    )
  }

  // ─── Group Editing ──────────────────────────────────────────

  function addGroup() {
    setFormGroups([...formGroups, createBlankGroup(formGroups.length)])
  }

  function updateGroup(groupId: string, updated: RuleGroup) {
    setFormGroups(formGroups.map((g) => (g.id === groupId ? updated : g)))
  }

  function removeGroup(groupId: string) {
    setFormGroups(formGroups.filter((g) => g.id !== groupId))
  }

  // ─── Global Rule CRUD ──────────────────────────────────────

  function handleAddRule() {
    const text = newRule.trim()
    if (!text) return
    persistRules([...rules, { id: crypto.randomUUID(), text }])
    setNewRule('')
  }

  function handleDeleteRule(id: string) {
    persistRules(rules.filter((r) => r.id !== id))
    setDeleteRuleConfirm(null)
  }

  function startEditRule(rule: GlobalRule) {
    setEditingRuleId(rule.id)
    setEditingRuleText(rule.text)
  }

  function saveEditRule() {
    if (!editingRuleId) return
    const text = editingRuleText.trim()
    if (!text) return
    persistRules(rules.map((r) => (r.id === editingRuleId ? { ...r, text } : r)))
    setEditingRuleId(null)
    setEditingRuleText('')
  }

  function cancelEditRule() {
    setEditingRuleId(null)
    setEditingRuleText('')
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
          <h1 className="text-xl font-semibold">Strategies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define trading strategies with organized rule groups and checklists
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={openAdd}>
            + New Strategy
          </Button>
        )}
      </div>

      {/* ── Strategy Form ── */}
      {showForm && (
        <div className="mb-6 border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editingId ? 'Edit Strategy' : 'New Strategy'}</h2>
            <TemplateSelector onSelect={applyTemplate} />
          </div>

          <div className="flex items-center gap-3">
            <IconPicker value={formIcon} onChange={setFormIcon} />
            <ColorPicker value={formColor} onChange={setFormColor} />
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Strategy name"
              className="flex-1"
            />
          </div>

          <Textarea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Brief description of this strategy..."
            rows={2}
            className="resize-none"
          />

          <Separator />

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Rule Groups</Label>
            <div className="space-y-3">
              {formGroups.map((group) => (
                <RuleGroupEditor
                  key={group.id}
                  group={group}
                  onUpdate={(g) => updateGroup(group.id, g)}
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

          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={!formName.trim()}>
              {editingId ? 'Update Strategy' : 'Save Strategy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {strategies.length === 0 && !showForm && (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No strategies yet. Create your first or start from a template.
          </p>
          <Button size="sm" variant="outline" onClick={openAdd}>
            + New Strategy
          </Button>
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
            onDelete={() => handleDelete(s.id)}
            disabled={showForm}
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
                onDelete={() => handleDelete(s.id)}
                disabled={showForm}
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

      <div className="flex gap-2 mb-4">
        <Input
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          placeholder="e.g., I will not chase pumps that already 5x'd"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddRule()
          }}
        />
        <Button size="sm" onClick={handleAddRule} disabled={!newRule.trim()}>
          Add
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No rules yet. Add rules you want to acknowledge before every session.
          </p>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => startEditRule(rule)}
                  >
                    Edit
                  </Button>
                  {deleteRuleConfirm === rule.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => setDeleteRuleConfirm(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteRuleConfirm(rule.id)}
                    >
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
