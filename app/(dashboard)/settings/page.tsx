'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
// HeroUI pilot: this page is migrated from shadcn/ui to HeroUI (v2). All logic,
// state, effects and API calls are unchanged — only the UI primitives differ.
import {
  Button,
  Input,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from '@heroui/react'
import { toast } from 'sonner'
import { FormSkeleton } from '@/components/skeletons'
import {
  loadTradeComments,
  getCommentsByCategory,
  type TradeComment,
} from '@/lib/trade-comments'
import { safeLocalStorage } from '@/lib/local-storage'

export default function SettingsPage() {
  const { user, session, isLoading: authLoading } = useSupabase()
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [tradingStartTime, setTradingStartTime] = useState('09:00')
  const [journalViewMode, setJournalViewMode] = useState<'merged' | 'grouped'>('merged')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  )
  const [isLoading, setIsLoading] = useState(true)

  // Reset-to-default confirm modal (HeroUI)
  const resetModal = useDisclosure()

  // Trade Comments state
  const [tradeComments, setTradeComments] = useState<TradeComment[]>([])
  const [activeCommentTab, setActiveCommentTab] = useState<TradeComment['category']>('entry')
  const [newCommentLabel, setNewCommentLabel] = useState('')
  const [newCommentRating, setNewCommentRating] = useState<TradeComment['rating']>('neutral')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [editingRating, setEditingRating] = useState<TradeComment['rating']>('neutral')
  const [deleteCommentConfirm, setDeleteCommentConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchSettings()
    } else if (!authLoading) {
      setIsLoading(false)
    }
  }, [session, authLoading])

  useEffect(() => {
    try {
      const mode = safeLocalStorage.getItem('journalio_journal_view_mode', null)
      if (mode === 'merged' || mode === 'grouped') setJournalViewMode(mode)
    } catch {}
  }, [])

  useEffect(() => {
    loadTradeComments().then(setTradeComments)
  }, [])

  async function addComment() {
    if (!newCommentLabel.trim()) return
    try {
      const res = await fetch('/api/trade-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCommentTab,
          label: newCommentLabel.trim(),
          rating: newCommentRating,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setTradeComments((prev) => [...prev, created])
        setNewCommentLabel('')
        setNewCommentRating('neutral')
      }
    } catch {
      toast.error('Failed to save comment')
    }
  }

  async function deleteComment(id: string) {
    try {
      const res = await fetch(`/api/trade-comments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTradeComments((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      toast.error('Failed to save comment')
    }
    setDeleteCommentConfirm(null)
  }

  function startEditComment(c: TradeComment) {
    setEditingCommentId(c.id)
    setEditingLabel(c.label)
    setEditingRating(c.rating)
  }

  async function saveEditComment() {
    if (!editingCommentId || !editingLabel.trim()) return
    try {
      const res = await fetch(`/api/trade-comments/${editingCommentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editingLabel.trim(), rating: editingRating }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTradeComments((prev) =>
          prev.map((c) => (c.id === editingCommentId ? updated : c))
        )
      }
    } catch {
      toast.error('Failed to save comment')
    }
    setEditingCommentId(null)
  }

  function cancelEditComment() {
    setEditingCommentId(null)
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setDisplayName(data.displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || '')
        setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
        setTradingStartTime(data.tradingStartTime || '09:00')
      }
    } catch {
      console.error('Failed to fetch settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          darkMode: false,
          timezone,
          tradingStartTime,
        }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        toast.error('Failed to save settings')
        setSaveStatus('idle')
      }
    } catch {
      toast.error('Failed to save settings')
      setSaveStatus('idle')
    }
  }

  async function executeReset() {
    resetModal.onClose()
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: '',
          darkMode: false,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tradingStartTime: '09:00',
        }),
      })
      if (res.ok) {
        setDisplayName('')
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
        setTradingStartTime('09:00')
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch {
      toast.error('Failed to reset settings')
    } finally {
      setSaveStatus('idle')
    }
  }

  // Timezone options for the HeroUI Autocomplete (replaces the shadcn
  // Popover+Command combobox). Autocomplete does its own filtering.
  const timezones: string[] = (() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return []
    }
  })()

  if (isLoading) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold mb-8">Settings</h1>
        <FormSkeleton fields={4} />
      </div>
    )
  }

  if (!session && !authLoading) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Sign in to manage settings.
        </p>
        <Button as="a" href="/auth/signin" variant="bordered" size="sm">
          Sign In
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-8">Settings</h1>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Profile</h2>
        <div className="space-y-4">
          <Input
            label="Display Name"
            labelPlacement="outside"
            value={displayName}
            onValueChange={setDisplayName}
            placeholder="Enter your name"
          />
          <div>
            <p className="text-xs mb-1.5">Email</p>
            <p className="text-sm text-muted-foreground">
              {session?.user?.email || 'Not set'}
            </p>
          </div>
        </div>
      </section>

      <hr className="mb-8 border-border" />

      {/* Preferences */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Preferences</h2>
        <div className="space-y-5">
          <Autocomplete
            label="Timezone"
            labelPlacement="outside"
            description="Used to determine when your trading day starts"
            placeholder="Select timezone..."
            defaultItems={timezones.map((tz) => ({ key: tz, label: tz.replace(/_/g, ' ') }))}
            selectedKey={timezone || null}
            onSelectionChange={(key) => {
              if (key) setTimezone(String(key))
            }}
          >
            {(item: { key: string; label: string }) => (
              <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
            )}
          </Autocomplete>

          <div>
            <p className="text-xs mb-1.5">Trading Start Time</p>
            <p className="text-xs text-muted-foreground mb-2">
              When your trading day begins (pre-session resets at this time)
            </p>
            <Input
              type="time"
              value={tradingStartTime}
              onValueChange={setTradingStartTime}
              aria-label="Trading start time"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs">Journal View Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                How to display trades from multiple wallets
              </p>
            </div>
            <div className="flex gap-1">
              {(['merged', 'grouped'] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={journalViewMode === mode ? 'solid' : 'bordered'}
                  onPress={() => {
                    setJournalViewMode(mode)
                    safeLocalStorage.setItem('journalio_journal_view_mode', mode)
                  }}
                >
                  {mode === 'merged' ? 'Merged List' : 'By Wallet'}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trade Comments */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Trade Comments</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Manage discipline comments used in journal entries. Add, edit, or remove comments using the controls below.
        </p>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4">
          {(['entry', 'exit', 'management'] as const).map((tab) => (
            <Button
              key={tab}
              size="sm"
              variant={activeCommentTab === tab ? 'solid' : 'bordered'}
              onPress={() => setActiveCommentTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {/* Comment list */}
        <div className="space-y-1.5 mb-4">
          {getCommentsByCategory(tradeComments, activeCommentTab).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded border border-border">
              {editingCommentId === c.id ? (
                <>
                  <Input
                    size="sm"
                    value={editingLabel}
                    onValueChange={setEditingLabel}
                    className="flex-1"
                    aria-label="Edit comment label"
                    onKeyDown={(e) => e.key === 'Enter' && saveEditComment()}
                  />
                  <Select
                    size="sm"
                    aria-label="Edit comment rating"
                    className="w-28"
                    selectedKeys={[editingRating]}
                    onSelectionChange={(keys) => {
                      const v = Array.from(keys)[0]
                      if (v) setEditingRating(v as TradeComment['rating'])
                    }}
                  >
                    <SelectItem key="positive">Positive</SelectItem>
                    <SelectItem key="neutral">Neutral</SelectItem>
                    <SelectItem key="negative">Negative</SelectItem>
                  </Select>
                  <Button variant="bordered" size="sm" onPress={saveEditComment}>Save</Button>
                  <Button variant="light" size="sm" onPress={cancelEditComment}>Cancel</Button>
                </>
              ) : (
                <>
                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                    c.rating === 'positive' ? 'bg-emerald-500' : c.rating === 'negative' ? 'bg-red-500' : 'bg-zinc-400'
                  }`} />
                  <span className="flex-1 text-xs">{c.label}</span>
                  {deleteCommentConfirm === c.id ? (
                    <>
                      <span className="text-xs text-muted-foreground">Delete?</span>
                      <Button color="danger" size="sm" onPress={() => deleteComment(c.id)}>Yes</Button>
                      <Button variant="light" size="sm" onPress={() => setDeleteCommentConfirm(null)}>No</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="light" size="sm" onPress={() => startEditComment(c)}>Edit</Button>
                      <Button variant="light" size="sm" color="danger" onPress={() => setDeleteCommentConfirm(c.id)}>Delete</Button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
          {getCommentsByCategory(tradeComments, activeCommentTab).length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No {activeCommentTab} comments yet.</p>
          )}
        </div>

        {/* Add form */}
        <div className="flex gap-2 items-end">
          <Input
            size="sm"
            value={newCommentLabel}
            onValueChange={setNewCommentLabel}
            placeholder={`New ${activeCommentTab} comment...`}
            className="flex-1"
            aria-label="New comment label"
            onKeyDown={(e) => e.key === 'Enter' && addComment()}
          />
          <Select
            size="sm"
            aria-label="New comment rating"
            className="w-28"
            selectedKeys={[newCommentRating]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0]
              if (v) setNewCommentRating(v as TradeComment['rating'])
            }}
          >
            <SelectItem key="positive">Positive</SelectItem>
            <SelectItem key="neutral">Neutral</SelectItem>
            <SelectItem key="negative">Negative</SelectItem>
          </Select>
          <Button size="sm" onPress={addComment} isDisabled={!newCommentLabel.trim()}>
            Add
          </Button>
        </div>
      </section>

      <hr className="mb-6 border-border" />

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="light"
          size="sm"
          onPress={async () => {
            try {
              await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ onboardingStep: 0 }),
              })
              window.location.reload()
            } catch {
              toast.error('Failed to restart onboarding')
            }
          }}
        >
          Replay Onboarding
        </Button>
        <Button variant="light" size="sm" onPress={resetModal.onOpen}>
          Reset to Default
        </Button>
        <Button
          color="primary"
          size="sm"
          onPress={handleSave}
          isDisabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : 'Save Changes'}
        </Button>
      </div>

      {/* Reset confirm — HeroUI Modal (replaces shadcn AlertDialog) */}
      <Modal isOpen={resetModal.isOpen} onOpenChange={resetModal.onOpenChange} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Reset all settings to default?</ModalHeader>
              <ModalBody>
                <p className="text-sm text-muted-foreground">
                  This will revert all preferences to their default values.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" size="sm" onPress={onClose}>Cancel</Button>
                <Button color="danger" size="sm" onPress={executeReset}>Reset</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
