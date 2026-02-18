'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

// --- Strategies ---

interface Strategy {
  id: string
  name: string
  description: string
  entryConditions: string[]
  exitConditions: string[]
  stopLossConditions: string[]
  active: boolean
  createdAt: string
}

const STRATEGIES_KEY = 'journalio_strategies'

function loadStrategies(): Strategy[] {
  try {
    const raw = localStorage.getItem(STRATEGIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStrategies(strategies: Strategy[]) {
  localStorage.setItem(STRATEGIES_KEY, JSON.stringify(strategies))
}

// --- Rules ---

interface Rule {
  id: string
  text: string
}

const RULES_KEY = 'journalio_rules'

function loadRules(): Rule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRules(rules: Rule[]) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules))
}

// --- Helpers ---

const emptyStrategyForm = {
  name: '',
  description: '',
  entryConditions: [''],
  exitConditions: [''],
  stopLossConditions: [''],
  active: true,
}

function ConditionList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  function update(index: number, value: string) {
    const updated = [...items]
    updated[index] = value
    onChange(updated)
  }

  function add() {
    onChange([...items, ''])
  }

  function remove(index: number) {
    if (items.length <= 1) return
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
              disabled={items.length <= 1}
              className="shrink-0 px-2 text-muted-foreground hover:text-destructive"
            >
              X
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={add}
        className="mt-1 text-xs text-muted-foreground"
      >
        + Add
      </Button>
    </div>
  )
}

function ConditionBullets({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-muted-foreground/50 mt-0.5">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [loaded, setLoaded] = useState(false)

  // Strategy form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyStrategyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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

  const persistRules = useCallback((updated: Rule[]) => {
    setRules(updated)
    saveRules(updated)
  }, [])

  // --- Strategy CRUD ---

  function openAdd() {
    setEditingId(null)
    setForm({
      name: '',
      description: '',
      entryConditions: [''],
      exitConditions: [''],
      stopLossConditions: [''],
      active: true,
    })
    setShowForm(true)
  }

  function openEdit(strategy: Strategy) {
    setEditingId(strategy.id)
    setForm({
      name: strategy.name,
      description: strategy.description,
      entryConditions: strategy.entryConditions.length > 0 ? [...strategy.entryConditions] : [''],
      exitConditions: strategy.exitConditions.length > 0 ? [...strategy.exitConditions] : [''],
      stopLossConditions: strategy.stopLossConditions.length > 0 ? [...strategy.stopLossConditions] : [''],
      active: strategy.active,
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyStrategyForm)
  }

  function handleSaveStrategy() {
    const trimmedName = form.name.trim()
    if (!trimmedName) return

    const clean = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean)

    if (editingId) {
      const updated = strategies.map((s) =>
        s.id === editingId
          ? {
              ...s,
              name: trimmedName,
              description: form.description.trim(),
              entryConditions: clean(form.entryConditions),
              exitConditions: clean(form.exitConditions),
              stopLossConditions: clean(form.stopLossConditions),
              active: form.active,
            }
          : s
      )
      persistStrategies(updated)
    } else {
      const newStrategy: Strategy = {
        id: crypto.randomUUID(),
        name: trimmedName,
        description: form.description.trim(),
        entryConditions: clean(form.entryConditions),
        exitConditions: clean(form.exitConditions),
        stopLossConditions: clean(form.stopLossConditions),
        active: form.active,
        createdAt: new Date().toISOString(),
      }
      persistStrategies([...strategies, newStrategy])
    }

    cancelForm()
  }

  function handleDeleteStrategy(id: string) {
    persistStrategies(strategies.filter((s) => s.id !== id))
    setDeleteConfirm(null)
  }

  function toggleActive(id: string) {
    const updated = strategies.map((s) =>
      s.id === id ? { ...s, active: !s.active } : s
    )
    persistStrategies(updated)
  }

  // --- Rule CRUD ---

  function handleAddRule() {
    const text = newRule.trim()
    if (!text) return
    const rule: Rule = { id: crypto.randomUUID(), text }
    persistRules([...rules, rule])
    setNewRule('')
  }

  function handleDeleteRule(id: string) {
    persistRules(rules.filter((r) => r.id !== id))
    setDeleteRuleConfirm(null)
  }

  function startEditRule(rule: Rule) {
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

  if (!loaded) {
    return (
      <div className="pt-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      {/* ========== STRATEGIES SECTION ========== */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Strategies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define your trading strategies with entry, exit, and stop loss conditions
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={openAdd}>
            Add Strategy
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 border rounded-lg p-4 space-y-4">
          <div>
            <Label htmlFor="strategy-name" className="text-sm font-medium mb-1.5 block">
              Strategy Name
            </Label>
            <Input
              id="strategy-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Momentum Scalping"
            />
          </div>

          <div>
            <Label htmlFor="strategy-desc" className="text-sm font-medium mb-1.5 block">
              Description
            </Label>
            <Textarea
              id="strategy-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this strategy about?"
              rows={2}
              className="resize-none"
            />
          </div>

          <ConditionList
            label="Entry Conditions"
            items={form.entryConditions}
            onChange={(entryConditions) => setForm({ ...form, entryConditions })}
            placeholder="e.g., Volume spike > 3x average"
          />

          <ConditionList
            label="Exit Conditions"
            items={form.exitConditions}
            onChange={(exitConditions) => setForm({ ...form, exitConditions })}
            placeholder="e.g., Take profit at 2x"
          />

          <ConditionList
            label="Stop Loss Conditions"
            items={form.stopLossConditions}
            onChange={(stopLossConditions) => setForm({ ...form, stopLossConditions })}
            placeholder="e.g., -15% from entry"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                form.active ? 'bg-emerald-500' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={form.active}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  form.active ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <Label className="text-sm">Active</Label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveStrategy} disabled={!form.name.trim()}>
              {editingId ? 'Update' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {strategies.length === 0 && !showForm && (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No strategies yet. Add your first trading strategy.
          </p>
          <Button size="sm" variant="outline" onClick={openAdd}>
            Add Strategy
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className={`border rounded-lg p-4 transition-opacity ${
              !strategy.active ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{strategy.name}</h3>
                <Badge variant={strategy.active ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                  {strategy.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => toggleActive(strategy.id)}
                >
                  {strategy.active ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => openEdit(strategy)}
                  disabled={showForm}
                >
                  Edit
                </Button>
                {deleteConfirm === strategy.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive"
                      onClick={() => handleDeleteStrategy(strategy.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteConfirm(strategy.id)}
                    disabled={showForm}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {strategy.description && (
              <p className="text-xs text-muted-foreground mb-2">{strategy.description}</p>
            )}

            <div className="space-y-2">
              <ConditionBullets label="Entry Conditions" items={strategy.entryConditions} />
              <ConditionBullets label="Exit Conditions" items={strategy.exitConditions} />
              <ConditionBullets label="Stop Loss" items={strategy.stopLossConditions} />
            </div>

            {strategy.entryConditions.length === 0 &&
              strategy.exitConditions.length === 0 &&
              strategy.stopLossConditions.length === 0 && (
                <p className="text-xs text-muted-foreground/50 italic">No conditions defined</p>
              )}
          </div>
        ))}
      </div>

      {/* ========== RULES SECTION ========== */}
      <Separator className="my-8" />

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Rules</h2>
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
