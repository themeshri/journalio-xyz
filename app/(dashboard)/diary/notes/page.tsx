'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Star, Trash2, X } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  type NoteData,
  type NoteFolder,
  NOTE_FOLDERS,
  isTradeLinked,
  loadNotes,
  saveNote,
  updateNote,
  deleteNote,
} from '@/lib/notes'
import { useWallet } from '@/lib/wallet-context'
import { formatValue } from '@/lib/formatters'

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeNote, setActiveNote] = useState<NoteData | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [activeFolder, setActiveFolder] = useState<string>('all')
  const lastSavedNote = useRef<NoteData | null>(null)
  const { flattenedTrades } = useWallet()

  useEffect(() => {
    loadNotes().then((data) => {
      setNotes(data)
      setLoading(false)
    })
  }, [])

  const handleNewNote = useCallback(() => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Discard?')) return
    }
    const newNote = { title: '', content: '', tags: [] }
    setActiveNote(newNote)
    lastSavedNote.current = newNote
    setIsDirty(false)
  }, [isDirty])

  const handleSave = useCallback(async () => {
    if (!activeNote) return
    setSaving(true)
    const saved = await saveNote(activeNote)
    if (saved) {
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === saved.id)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = saved
          return updated
        }
        return [saved, ...prev]
      })
      setActiveNote(saved)
      lastSavedNote.current = saved
      setIsDirty(false)
      toast.success('Note saved')
    } else {
      toast.error('Failed to save note')
    }
    setSaving(false)
  }, [activeNote])

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteNote(id)
    if (ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (activeNote?.id === id) setActiveNote(null)
      toast.success('Note deleted')
    } else {
      toast.error('Failed to delete note')
    }
  }, [activeNote])

  const addTag = useCallback(() => {
    const tag = tagInput.trim()
    if (!tag || !activeNote) return
    if (!activeNote.tags.includes(tag)) {
      setActiveNote({ ...activeNote, tags: [...activeNote.tags, tag] })
      setIsDirty(true)
    }
    setTagInput('')
  }, [tagInput, activeNote])

  const removeTag = useCallback((tag: string) => {
    if (!activeNote) return
    setActiveNote({ ...activeNote, tags: activeNote.tags.filter((t) => t !== tag) })
    setIsDirty(true)
  }, [activeNote])

  const toggleFavorite = useCallback(
    async (note: NoteData, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!note.id) return
      const next = !note.favorite
      // Optimistic — a star that lags on click feels broken.
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, favorite: next } : n)))
      setActiveNote((prev): NoteData | null =>
        prev && prev.id === note.id ? { ...prev, favorite: next } : prev
      )
      const saved = await updateNote(note.id, { favorite: next })
      if (!saved) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, favorite: !next } : n)))
        toast.error('Failed to update favorite')
      }
    },
    []
  )

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: notes.length, favorites: 0 }
    for (const f of NOTE_FOLDERS) map[f.id] = 0
    for (const n of notes) {
      if (n.favorite) map.favorites++
      const folder = n.folder ?? 'my-notes'
      map[folder] = (map[folder] ?? 0) + 1
    }
    return map
  }, [notes])

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return notes.filter((n) => {
      if (activeFolder === 'favorites' && !n.favorite) return false
      if (activeFolder !== 'all' && activeFolder !== 'favorites') {
        if ((n.folder ?? 'my-notes') !== activeFolder) return false
      }
      if (!q) return true
      return (
        n.title.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [notes, searchQuery, activeFolder])

  /** Stats for the header shown on a trade-linked note (docs §2). */
  const linkedTrade = useMemo(() => {
    if (!activeNote || !isTradeLinked(activeNote)) return null
    return (
      flattenedTrades.find(
        (t) =>
          t.walletAddress === activeNote.linkedWalletAddress &&
          t.tokenMint === activeNote.linkedTokenMint &&
          t.tradeNumber === activeNote.linkedTradeNumber
      ) ?? null
    )
  }, [activeNote, flattenedTrades])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Notes</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
      {/* Sidebar: note list */}
      <div className={`w-full md:w-72 md:shrink-0 flex flex-col ${activeNote ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Notes</h1>
          <Button size="sm" variant="outline" onClick={handleNewNote}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-2"
        />

        {/* Folders — counts per folder, as in docs §3.4 */}
        <div className="mb-3 flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'favorites', label: 'Favorites' },
            ...NOTE_FOLDERS,
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFolder(f.id)}
              className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                activeFolder === f.id
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {f.label}
              <span className="ml-1 font-mono tabular-nums opacity-60">
                {counts[f.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {filteredNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {notes.length === 0 ? 'No notes yet' : 'No matches'}
            </p>
          ) : (
            filteredNotes.map((note) => (
              <Card
                key={note.id}
                className={`cursor-pointer transition-colors ${
                  activeNote?.id === note.id ? 'border-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  if (activeNote?.id !== note.id && isDirty) {
                    if (!window.confirm('You have unsaved changes. Discard?')) return
                  }
                  setActiveNote(note)
                  lastSavedNote.current = note
                  setIsDirty(false)
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {note.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {note.content.replace(/<[^>]*>/g, '').slice(0, 60) || 'Empty note'}
                      </p>
                      {note.updatedAt && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        className={`p-0.5 ${
                          note.favorite
                            ? 'text-amber-500'
                            : 'text-muted-foreground hover:text-amber-500'
                        }`}
                        aria-label={
                          note.favorite
                            ? `Unfavorite ${note.title || 'Untitled'}`
                            : `Favorite ${note.title || 'Untitled'}`
                        }
                        aria-pressed={!!note.favorite}
                        onClick={(e) => toggleFavorite(note, e)}
                      >
                        <Star
                          className="h-3.5 w-3.5"
                          fill={note.favorite ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-destructive p-0.5"
                        aria-label={`Delete note ${note.title || 'Untitled'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (note.id) setDeleteNoteId(note.id)
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {note.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeNote ? 'hidden md:flex' : 'flex'}`}>
        {!activeNote ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a note or create a new one
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Button
                size="sm"
                variant="ghost"
                className="md:hidden"
                onClick={() => { setActiveNote(null); setIsDirty(false) }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Input
                placeholder="Note title..."
                value={activeNote.title}
                onChange={(e) => { setActiveNote({ ...activeNote, title: e.target.value }); setIsDirty(true) }}
                className="text-lg font-medium"
              />
              <Select
                value={activeNote.folder ?? 'my-notes'}
                onValueChange={(v) => {
                  setActiveNote({ ...activeNote, folder: v as NoteFolder })
                  setIsDirty(true)
                }}
              >
                <SelectTrigger className="h-8 w-[150px] shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_FOLDERS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {/* Trade-linked stat header + backlink (docs §2). Rendered only
                when the note points at a cycle we can still resolve. */}
            {isTradeLinked(activeNote) && (
              <Card className="mb-3">
                <CardContent className="p-3">
                  {linkedTrade ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {linkedTrade.token}
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            #{linkedTrade.tradeNumber}
                          </span>
                        </span>
                        <Link
                          href="/trade-journal"
                          className="text-[11px] text-emerald-500 hover:underline"
                        >
                          View trade details &rarr;
                        </Link>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                        {[
                          {
                            label: 'Net P&L',
                            value: `${linkedTrade.profitLoss >= 0 ? '+' : ''}${formatValue(linkedTrade.profitLoss)}`,
                            tone:
                              linkedTrade.profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500',
                          },
                          { label: 'Bought', value: formatValue(linkedTrade.totalBuyValue) },
                          { label: 'Sold', value: formatValue(linkedTrade.totalSellValue) },
                          {
                            label: 'Trades',
                            value: String(linkedTrade.buys.length + linkedTrade.sells.length),
                          },
                        ].map((s) => (
                          <div key={s.label}>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {s.label}
                            </p>
                            <p
                              className={`font-mono text-xs tabular-nums ${s.tone ?? ''}`}
                            >
                              {s.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    // The cycle is not in the current wallet selection.
                    <p className="text-[11px] text-muted-foreground">
                      Linked to a trade that isn&apos;t in the active wallet selection.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {activeNote.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-muted rounded"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive" aria-label={`Remove tag ${tag}`}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <form
                onSubmit={(e) => { e.preventDefault(); addTag() }}
                className="inline-flex"
              >
                <Input
                  placeholder="Add tag (Enter to add)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="h-6 w-24 text-xs"
                />
              </form>
            </div>

            <RichTextEditor
              content={activeNote.content}
              onChange={(html) => { setActiveNote({ ...activeNote, content: html }); setIsDirty(true) }}
              placeholder="Write your notes here..."
              className="flex-1"
            />
          </>
        )}
      </div>
    </div>

    <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (deleteNoteId) handleDelete(deleteNoteId); setDeleteNoteId(null) }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
