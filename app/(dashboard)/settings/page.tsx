'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { FormSkeleton } from '@/components/skeletons'
import {
  loadTradeComments,
  getCommentsByCategory,
  type TradeComment,
} from '@/lib/trade-comments'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [displayName, setDisplayName] = useState('')
  const [transactionLimit, setTransactionLimit] = useState('50')
  const [showUSDValues, setShowUSDValues] = useState(true)
  const [journalViewMode, setJournalViewMode] = useState<'merged' | 'grouped'>('merged')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [resetConfirm, setResetConfirm] = useState(false)

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
    if (status === 'authenticated') {
      fetchSettings()
    } else if (status === 'unauthenticated') {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    try {
      const mode = localStorage.getItem('journalio_journal_view_mode')
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
    } catch { /* ignore */ }
  }

  async function deleteComment(id: string) {
    try {
      const res = await fetch(`/api/trade-comments/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTradeComments((prev) => prev.filter((c) => c.id !== id))
      }
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
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
        setDisplayName(data.displayName || '')
        setTransactionLimit(String(data.transactionLimit || 50))
        setShowUSDValues(data.showUSDValues ?? true)
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
          transactionLimit: parseInt(transactionLimit),
          showUSDValues,
          darkMode: false,
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
    setResetConfirm(false)
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: '',
          transactionLimit: 50,
          showUSDValues: true,
          darkMode: false,
        }),
      })
      if (res.ok) {
        setDisplayName('')
        setTransactionLimit('50')
        setShowUSDValues(true)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch {
      toast.error('Failed to reset settings')
    } finally {
      setSaveStatus('idle')
    }
  }

  if (isLoading) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold mb-8">Settings</h1>
        <FormSkeleton fields={4} />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Sign in to manage settings.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href="/auth/signin">Sign In</a>
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
          <div>
            <Label htmlFor="displayName" className="text-xs mb-1.5">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5">Email</Label>
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
          <div>
            <Label htmlFor="transactionLimit" className="text-xs mb-1.5">
              Transaction Fetch Limit
            </Label>
            <Select
              value={transactionLimit}
              onValueChange={setTransactionLimit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 transactions</SelectItem>
                <SelectItem value="50">50 transactions</SelectItem>
                <SelectItem value="100">100 transactions</SelectItem>
                <SelectItem value="200">200 transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Show USD Values</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display amounts in USD
              </p>
            </div>
            <Switch
              checked={showUSDValues}
              onCheckedChange={setShowUSDValues}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Journal View Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                How to display trades from multiple wallets
              </p>
            </div>
            <div className="flex gap-1">
              {(['merged', 'grouped'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setJournalViewMode(mode)
                    localStorage.setItem('journalio_journal_view_mode', mode)
                  }}
                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                    journalViewMode === mode
                      ? 'font-medium bg-muted border-border'
                      : 'text-muted-foreground border-border hover:bg-muted/50 cursor-pointer'
                  }`}
                >
                  {mode === 'merged' ? 'Merged List' : 'By Wallet'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trade Comments */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Trade Comments</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Manage discipline comments used in journal entries. Changes save automatically.
        </p>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4">
          {(['entry', 'exit', 'management'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveCommentTab(tab)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                activeCommentTab === tab
                  ? 'font-medium bg-muted border-border'
                  : 'text-muted-foreground border-border hover:bg-muted/50 cursor-pointer'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Comment list */}
        <div className="space-y-1.5 mb-4">
          {getCommentsByCategory(tradeComments, activeCommentTab).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded border border-border">
              {editingCommentId === c.id ? (
                <>
                  <Input
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    className="h-7 text-xs flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && saveEditComment()}
                  />
                  <Select value={editingRating} onValueChange={(v) => setEditingRating(v as TradeComment['rating'])}>
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={saveEditComment}>Save</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEditComment}>Cancel</Button>
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
                      <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => deleteComment(c.id)}>Yes</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setDeleteCommentConfirm(null)}>No</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => startEditComment(c)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-destructive" onClick={() => setDeleteCommentConfirm(c.id)}>Delete</Button>
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
        <div className="flex gap-2">
          <Input
            value={newCommentLabel}
            onChange={(e) => setNewCommentLabel(e.target.value)}
            placeholder={`New ${activeCommentTab} comment...`}
            className="text-xs h-8 flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addComment()}
          />
          <Select value={newCommentRating} onValueChange={(v) => setNewCommentRating(v as TradeComment['rating'])}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs" onClick={addComment} disabled={!newCommentLabel.trim()}>
            Add
          </Button>
        </div>
      </section>

      <hr className="mb-6 border-border" />

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setResetConfirm(true)}>
          Reset to Default
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
        >
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : 'Save Changes'}
        </Button>
      </div>

      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all settings to default?</AlertDialogTitle>
            <AlertDialogDescription>This will revert all preferences to their default values.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
