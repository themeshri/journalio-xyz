'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, Trash2, X } from 'lucide-react'
import { type NoteData, loadNotes, saveNote, deleteNote } from '@/lib/notes'

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeNote, setActiveNote] = useState<NoteData | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    loadNotes().then((data) => {
      setNotes(data)
      setLoading(false)
    })
  }, [])

  const handleNewNote = useCallback(() => {
    setActiveNote({ title: '', content: '', tags: [] })
  }, [])

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
    }
    setTagInput('')
  }, [tagInput, activeNote])

  const removeTag = useCallback((tag: string) => {
    if (!activeNote) return
    setActiveNote({ ...activeNote, tags: activeNote.tags.filter((t) => t !== tag) })
  }, [activeNote])

  const filteredNotes = searchQuery
    ? notes.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : notes

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
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Sidebar: note list */}
      <div className="w-72 shrink-0 flex flex-col">
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
          className="mb-3"
        />

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
                onClick={() => setActiveNote(note)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {note.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {note.content.slice(0, 60) || 'Empty note'}
                      </p>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive shrink-0 p-0.5"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (note.id) handleDelete(note.id)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
      <div className="flex-1 flex flex-col min-w-0">
        {!activeNote ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a note or create a new one
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Input
                placeholder="Note title..."
                value={activeNote.title}
                onChange={(e) => setActiveNote({ ...activeNote, title: e.target.value })}
                className="text-lg font-medium"
              />
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {activeNote.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-muted rounded"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <form
                onSubmit={(e) => { e.preventDefault(); addTag() }}
                className="inline-flex"
              >
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="h-6 w-24 text-xs"
                />
              </form>
            </div>

            <Textarea
              placeholder="Write your notes here..."
              value={activeNote.content}
              onChange={(e) => setActiveNote({ ...activeNote, content: e.target.value })}
              className="flex-1 min-h-[300px] resize-none"
            />
          </>
        )}
      </div>
    </div>
  )
}
