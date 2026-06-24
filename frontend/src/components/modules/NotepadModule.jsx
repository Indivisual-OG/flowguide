import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search, Trash2, Tag, Save, ArrowLeft } from 'lucide-react'
import { getNotes, getNote, createNote, updateNote, deleteNote, getAllTags } from '../../utils/api.js'
import { formatDistanceToNow } from 'date-fns'

export default function NotepadModule({ onComplete }) {
  const [notes, setNotes]       = useState([])
  const [tags, setTags]         = useState([])
  const [search, setSearch]     = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [selected, setSelected] = useState(null)   // null = list view
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [saving, setSaving]     = useState(false)
  const [dirty, setDirty]       = useState(false)
  const saveTimer = useRef(null)

  const load = async () => {
    const params = {}
    if (search)    params.search = search
    if (activeTag) params.tag    = activeTag
    const data = await getNotes(params)
    setNotes(data)
  }

  useEffect(() => { load() }, [search, activeTag])
  useEffect(() => { getAllTags().then(setTags) }, [])

  const openNote = async (id) => {
    const note = await getNote(id)
    setSelected(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditTags(note.tags)
    setDirty(false)
  }

  const newNote = async () => {
    const note = await createNote({ title: 'New Note', content: '', tags: '' })
    const full = await getNote(note.id)
    setNotes(prev => [{ ...full, preview: '' }, ...prev])
    openNote(note.id)
  }

  const autoSave = (title, content, tags) => {
    setDirty(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await updateNote(selected.id, { title, content, tags })
      setSaving(false)
      setDirty(false)
      load()
    }, 800)
  }

  const handleTitle = e => {
    setEditTitle(e.target.value)
    autoSave(e.target.value, editContent, editTags)
  }

  const handleContent = e => {
    setEditContent(e.target.value)
    autoSave(editTitle, e.target.value, editTags)
  }

  const handleTags = e => {
    setEditTags(e.target.value)
    autoSave(editTitle, editContent, e.target.value)
  }

  const remove = async (id) => {
    if (!confirm('Delete this note?')) return
    await deleteNote(id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  // Note editor view
  if (selected) return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { setSelected(null); load() }} className="btn-ghost">
          <ArrowLeft size={15} /> Notes
        </button>
        <span className="text-xs text-mist-400 ml-auto">
          {saving ? '💾 Saving…' : dirty ? '● Unsaved' : '✓ Saved'}
        </span>
      </div>
      <input
        className="w-full text-xl font-semibold text-mist-800 border-none outline-none bg-transparent mb-3 placeholder:text-mist-300"
        placeholder="Note title…"
        value={editTitle}
        onChange={handleTitle}
      />
      <div className="flex items-center gap-2 mb-4">
        <Tag size={13} className="text-mist-400" />
        <input
          className="text-sm text-mist-500 border-none outline-none bg-transparent flex-1 placeholder:text-mist-300"
          placeholder="tags, comma, separated"
          value={editTags}
          onChange={handleTags}
        />
      </div>
      <textarea
        className="w-full min-h-[350px] text-sm text-mist-700 border-none outline-none bg-transparent resize-none leading-relaxed placeholder:text-mist-300"
        placeholder="Start writing…"
        value={editContent}
        onChange={handleContent}
      />
    </div>
  )

  // List view
  return (
    <div>
      <h2 className="module-header">📓 Knowledge Notepad</h2>
      <p className="module-subtitle">Capture thoughts, ideas, and insights.</p>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
          <input
            className="input pl-9"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={newNote} className="btn-primary">
          <Plus size={16} /> New
        </button>
      </div>

      {/* Tags filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTag('')}
            className={`tag cursor-pointer ${!activeTag ? 'bg-flow-600 text-white' : ''}`}
          >
            All
          </button>
          {tags.map(t => (
            <button
              key={t}
              onClick={() => setActiveTag(activeTag === t ? '' : t)}
              className={`tag cursor-pointer ${activeTag === t ? 'bg-flow-600 text-white' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-12 text-mist-400">
          <p className="mb-3 text-3xl">📓</p>
          <p>No notes yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div
              key={n.id}
              onClick={() => openNote(n.id)}
              className="card p-4 cursor-pointer hover:border-flow-300 hover:shadow transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-mist-800 truncate">{n.title}</p>
                  {n.preview && (
                    <p className="text-xs text-mist-400 mt-0.5 line-clamp-2">{n.preview}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {n.tags && n.tags.split(',').filter(Boolean).map(t => (
                      <span key={t} className="tag">{t.trim()}</span>
                    ))}
                    <span className="text-xs text-mist-300">
                      {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); remove(n.id) }}
                  className="text-mist-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
