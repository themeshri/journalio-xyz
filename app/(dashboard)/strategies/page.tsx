'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Button,
  Input,
  Textarea,
  Chip,
  Checkbox,
  Accordion,
  AccordionItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react'
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
  loadRules,
  createRule,
  updateRule,
  deleteRule,
} from '@/lib/rules'
import { useWallet } from '@/lib/wallet-context'
import { safeLocalStorage } from '@/lib/local-storage'
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
    <Popover placement="bottom-start">
      <PopoverTrigger>
        <button
          type="button"
          className="w-8 h-8 rounded-md border-2 border-border shrink-0"
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
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
    <Popover placement="bottom-start">
      <PopoverTrigger>
        <button
          type="button"
          className="w-8 h-8 rounded-md border-2 border-border shrink-0 flex items-center justify-center text-lg"
        >
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
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
            size="sm"
            aria-label="Rule description"
            value={rule.text}
            onValueChange={(v) => onUpdate({ ...rule, text: v })}
            placeholder="Rule description..."
            className="text-sm"
          />
          <Button
            type="button"
            variant="light"
            size="sm"
            onPress={onRemove}
            className="shrink-0 px-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            X
          </Button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              isSelected={rule.isRequired}
              onValueChange={(checked) => onUpdate({ ...rule, isRequired: !!checked })}
            />
            <span className="text-muted-foreground">Required</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Show:</span>
            <Select
              aria-label="Show rule when"
              size="sm"
              className="w-[100px]"
              selectedKeys={[rule.showWhen]}
              onSelectionChange={(keys) => {
                const v = Array.from(keys)[0]
                if (v) onUpdate({ ...rule, showWhen: v as StrategyRule['showWhen'] })
              }}
            >
              <SelectItem key="always">Always</SelectItem>
              <SelectItem key="winner">Winner</SelectItem>
              <SelectItem key="loser">Loser</SelectItem>
              <SelectItem key="breakeven">Breakeven</SelectItem>
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
          size="sm"
          aria-label="Group name"
          value={group.name}
          onValueChange={(v) => onUpdate({ ...group, name: v })}
          placeholder="Group name (e.g., Entry Criteria)"
          className="text-sm font-medium"
        />
        <Button
          type="button"
          variant="light"
          size="sm"
          onPress={onRemove}
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
        variant="light"
        size="sm"
        onPress={addGroupRule}
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
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-start">
      <PopoverTrigger>
        <Button type="button" variant="bordered" size="sm" className="text-xs">
          Use Template
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2">
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
            <Chip size="sm" variant="flat" className="text-[10px] px-1.5 py-0">
              Archived
            </Chip>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="light"
            className="h-7 px-2 text-xs text-muted-foreground"
            onPress={onArchive}
          >
            {strategy.isArchived ? 'Restore' : 'Archive'}
          </Button>
          <Button
            size="sm"
            variant="light"
            className="h-7 px-2 text-xs text-muted-foreground"
            onPress={onEdit}
            isDisabled={disabled}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="light"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onPress={onRequestDelete}
            isDisabled={disabled}
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

          <Accordion selectionMode="multiple" isCompact className="w-full px-0">
            {strategy.ruleGroups
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((group) => (
                <AccordionItem
                  key={group.id}
                  aria-label={group.name}
                  classNames={{ trigger: 'py-1.5', title: 'text-xs font-medium text-muted-foreground', content: 'pb-2' }}
                  title={`${group.name} (${group.rules.length})`}
                >
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
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingRuleText, setEditingRuleText] = useState('')

  useEffect(() => {
    Promise.all([loadStrategies(true), loadRules()]).then(([strats, loadedRules]) => {
      setStrategies(strats)
      setRules(loadedRules)
      setLoaded(true)
    })
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
    const created = await createRule(text)
    if (created) {
      setRules((prev) => [...prev, created])
      setNewRule('')
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
  }

  async function saveEditRule() {
    if (!editingRuleId) return
    const text = editingRuleText.trim()
    if (!text) return
    const updated = await updateRule(editingRuleId, { text })
    if (updated) {
      setRules((prev) => prev.map((r) => (r.id === editingRuleId ? updated : r)))
      toast.success('Rule updated')
    } else {
      toast.error('Failed to update rule')
    }
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
            <Button size="sm" color="primary" onPress={openAdd}>
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
            <TemplateSelector onSelect={applyTemplate} />
          </div>

          <div className="flex items-center gap-3">
            <IconPicker value={formIcon} onChange={setFormIcon} />
            <ColorPicker value={formColor} onChange={setFormColor} />
            <Input
              size="sm"
              aria-label="Strategy name"
              value={formName}
              onValueChange={(v) => { setFormName(v); setFormDirty(true) }}
              placeholder="Strategy name"
              className="flex-1"
            />
          </div>

          <Textarea
            aria-label="Strategy description"
            value={formDescription}
            onValueChange={(v) => { setFormDescription(v); setFormDirty(true) }}
            placeholder="Brief description of this strategy..."
            rows={2}
            className="resize-none"
          />

          {advancedMode && (
            <>
              <Divider />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Rule Groups</p>
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
                  variant="bordered"
                  size="sm"
                  onPress={addGroup}
                  className="mt-3 text-xs"
                >
                  + Add Rule Group
                </Button>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button size="sm" color="primary" onPress={handleSave} isDisabled={!formName.trim() || saving}>
              {saving ? 'Saving...' : editingId ? 'Update Strategy' : 'Save Strategy'}
            </Button>
            <Button size="sm" variant="light" onPress={cancelForm}>
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
            {TEMPLATES.map((t) => (
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
            <Button size="sm" variant="bordered" onPress={openAdd}>
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
          <Divider className="my-6" />
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
      <Divider className="my-8" />

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Global Rules</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Trading rules that apply across all strategies. These show up in your pre-session checklist.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          size="sm"
          aria-label="New global rule"
          value={newRule}
          onValueChange={setNewRule}
          placeholder="e.g., I will not chase pumps that already 5x'd"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddRule()
          }}
        />
        <Button size="sm" color="primary" onPress={handleAddRule} isDisabled={!newRule.trim()}>
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
                    size="sm"
                    aria-label="Edit rule text"
                    value={editingRuleText}
                    onValueChange={setEditingRuleText}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditRule()
                      if (e.key === 'Escape') cancelEditRule()
                    }}
                    autoFocus
                  />
                  <Button size="sm" color="primary" onPress={saveEditRule} isDisabled={!editingRuleText.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="light" onPress={cancelEditRule}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm flex-1">{rule.text}</span>
                  <Button
                    size="sm"
                    variant="light"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onPress={() => startEditRule(rule)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onPress={() => setDeleteRuleId(rule.id)}
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
      <Modal isOpen={!!deleteStrategyId} onOpenChange={(open) => !open && setDeleteStrategyId(null)} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Delete this strategy?</ModalHeader>
              <ModalBody>
                <p className="text-sm text-muted-foreground">This action cannot be undone. The strategy and all its rules will be permanently deleted.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" size="sm" onPress={onClose}>Cancel</Button>
                <Button color="danger" size="sm" onPress={() => { if (deleteStrategyId) handleDelete(deleteStrategyId) }}>Delete</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Delete Rule Confirmation ── */}
      <Modal isOpen={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Delete this rule?</ModalHeader>
              <ModalBody>
                <p className="text-sm text-muted-foreground">This rule will be permanently removed from your global rules list.</p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" size="sm" onPress={onClose}>Cancel</Button>
                <Button color="danger" size="sm" onPress={() => { if (deleteRuleId) handleDeleteRule(deleteRuleId) }}>Delete</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
