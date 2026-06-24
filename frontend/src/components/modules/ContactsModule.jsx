import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search, Trash2, Edit2, Check, X, Cake, Upload } from 'lucide-react'
import {
  getContacts, getUpcomingBirthdays, createContact, updateContact,
  deleteContact, importVcf
} from '../../utils/api.js'

const EMPTY = { name: '', email: '', phone: '', birthday: '', notes: '' }

// Defined OUTSIDE ContactsModule so React doesn't remount it on every keystroke,
// which would cause inputs to lose focus after each character.
function ContactForm({ data, setData, onSave, onCancel }) {
  return (
    <div className="space-y-2 p-3 bg-mist-50 rounded-xl border border-mist-200">
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="Name *" value={data.name}
          onChange={e => setData(d => ({ ...d, name: e.target.value }))} />
        <input className="input" placeholder="Email" value={data.email || ''}
          onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
        <input className="input" placeholder="Phone" value={data.phone || ''}
          onChange={e => setData(d => ({ ...d, phone: e.target.value }))} />
        <input className="input" placeholder="Birthday (MM-DD or YYYY-MM-DD)" value={data.birthday || ''}
          onChange={e => setData(d => ({ ...d, birthday: e.target.value }))} />
      </div>
      <input className="input" placeholder="Notes" value={data.notes || ''}
        onChange={e => setData(d => ({ ...d, notes: e.target.value }))} />
      <div className="flex gap-2">
        <button onClick={onSave} className="btn-primary"><Check size={14}/> Save</button>
        <button onClick={onCancel} className="btn-secondary"><X size={14}/> Cancel</button>
      </div>
    </div>
  )
}

export default function ContactsModule({ onComplete }) {
  const [contacts, setContacts]         = useState([])
  const [birthdays, setBirthdays]       = useState([])
  const [search, setSearch]             = useState('')
  const [adding, setAdding]             = useState(false)
  const [newData, setNewData]           = useState({ ...EMPTY })
  const [editId, setEditId]             = useState(null)
  const [editData, setEditData]         = useState({})
  const [view, setView]                 = useState('contacts')  // contacts | birthdays
  const [importing, setImporting]       = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef()

  const load = async () => {
    const params = search ? { search } : {}
    getContacts(params).then(setContacts)
    getUpcomingBirthdays(60).then(setBirthdays)
  }

  useEffect(() => { load() }, [search])

  const add = async () => {
    if (!newData.name.trim()) return
    await createContact(newData)
    setAdding(false)
    setNewData({ ...EMPTY })
    load()
  }

  const startEdit = (c) => {
    setEditId(c.id)
    setEditData({ name: c.name, email: c.email || '', phone: c.phone || '',
                  birthday: c.birthday || '', notes: c.notes || '' })
  }

  const saveEdit = async (id) => {
    await updateContact(id, editData)
    setEditId(null)
    load()
  }

  const remove = async (id) => {
    if (!confirm('Delete this contact?')) return
    await deleteContact(id)
    load()
  }

  const handleVcfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const result = await importVcf(form)
      setImportResult(result)
      load()
    } catch (err) {
      setImportResult({ error: err?.response?.data?.detail || 'Import failed' })
    }
    setImporting(false)
    e.target.value = ''
  }

  return (
    <div>
      <h2 className="module-header">🎂 Contacts & Birthdays</h2>
      <p className="module-subtitle">Keep track of people you care about.</p>

      {/* Upcoming birthdays banner */}
      {birthdays.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Cake size={16} className="text-amber-500" />
            <p className="text-sm font-medium text-amber-700">Upcoming Birthdays</p>
          </div>
          <div className="space-y-1">
            {birthdays.slice(0, 5).map(b => (
              <div key={b.id} className="flex justify-between text-sm">
                <span className="text-amber-800">{b.name}</span>
                <span className="text-amber-600">
                  {b.days_until === 0 ? '🎉 Today!' : `in ${b.days_until} day${b.days_until === 1 ? '' : 's'}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-mist-100 rounded-xl p-1 mb-4">
        {[['contacts', 'Contacts'], ['birthdays', 'Birthdays']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all ${
              view === v ? 'bg-white shadow text-flow-700' : 'text-mist-500 hover:text-mist-700'
            }`}>{l}</button>
        ))}
      </div>

      {view === 'birthdays' ? (
        <div>
          {birthdays.length === 0 ? (
            <p className="text-center text-mist-400 py-8">No upcoming birthdays in the next 60 days.</p>
          ) : (
            <div className="space-y-2">
              {birthdays.map(b => (
                <div key={b.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-mist-800">{b.name}</p>
                    <p className="text-xs text-mist-400">{b.birthday}</p>
                  </div>
                  <span className={`text-sm font-medium ${b.days_until <= 7 ? 'text-amber-500' : 'text-mist-500'}`}>
                    {b.days_until === 0 ? '🎉 Today!' : `${b.days_until}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Search + Import + Add */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-400" />
              <input className="input pl-9" placeholder="Search contacts…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="btn-secondary"
              title="Import contacts from a .vcf vCard file"
            >
              <Upload size={15} />
              {importing ? 'Importing…' : 'Import .vcf'}
            </button>
            <input ref={fileRef} type="file" accept=".vcf" className="hidden" onChange={handleVcfUpload} />
            <button onClick={() => { setAdding(true); setImportResult(null) }} className="btn-primary">
              <Plus size={16} /> Add
            </button>
          </div>

          {/* Import result feedback */}
          {importResult && !importResult.error && (
            <div className="mb-4 p-4 bg-flow-50 border border-flow-200 rounded-xl text-sm">
              <p className="font-medium text-flow-700 mb-1">
                ✅ Imported {importResult.imported} contact{importResult.imported !== 1 ? 's' : ''}
                {importResult.skipped > 0 && `, skipped ${importResult.skipped} duplicate${importResult.skipped !== 1 ? 's' : ''}`}
              </p>
              {importResult.imported_names.length > 0 && (
                <p className="text-flow-600 text-xs">Added: {importResult.imported_names.join(', ')}</p>
              )}
              {importResult.skipped_names.length > 0 && (
                <p className="text-mist-400 text-xs mt-0.5">Already existed: {importResult.skipped_names.join(', ')}</p>
              )}
              <button onClick={() => setImportResult(null)} className="text-xs text-mist-400 mt-2 hover:text-mist-600">
                Dismiss
              </button>
            </div>
          )}
          {importResult?.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              ❌ {importResult.error}
            </div>
          )}

          {adding && (
            <div className="mb-4">
              <ContactForm data={newData} setData={setNewData} onSave={add} onCancel={() => setAdding(false)} />
            </div>
          )}

          {contacts.length === 0 ? (
            <div className="text-center py-12 text-mist-400">
              <p className="text-3xl mb-3">👤</p>
              <p className="mb-2">No contacts yet.</p>
              <p className="text-xs">Add one manually or import a <strong>.vcf</strong> file<br/>from your phone, Gmail, or Outlook.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map(c => (
                <div key={c.id} className="card p-4">
                  {editId === c.id ? (
                    <ContactForm data={editData} setData={setEditData}
                      onSave={() => saveEdit(c.id)} onCancel={() => setEditId(null)} />
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-flow-100 rounded-full flex items-center justify-center text-flow-700 font-semibold text-sm shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-mist-800">{c.name}</p>
                        <div className="text-xs text-mist-400 space-x-2">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                          {c.birthday && (
                            <span>🎂 {c.birthday}{c.days_until_birthday !== null ? ` (${c.days_until_birthday}d)` : ''}</span>
                          )}
                        </div>
                        {c.notes && <p className="text-xs text-mist-500 mt-1">{c.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(c)} className="btn-ghost p-1.5"><Edit2 size={13}/></button>
                        <button onClick={() => remove(c.id)} className="btn-ghost p-1.5 text-red-400"><Trash2 size={13}/></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
