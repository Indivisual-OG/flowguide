import React, { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, BarChart2, Edit2, Check, X } from 'lucide-react'
import {
  getReceipts, getCategories, uploadReceipt, updateReceipt,
  deleteReceipt, getSpendingSummary
} from '../../utils/api.js'

export default function ReceiptsModule({ onComplete }) {
  const [receipts, setReceipts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [summary, setSummary]         = useState([])
  const [view, setView]               = useState('list')   // list | upload | summary
  const [uploading, setUploading]     = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [editId, setEditId]           = useState(null)
  const [editData, setEditData]       = useState({})
  const fileRef = useRef()

  useEffect(() => {
    getReceipts().then(setReceipts)
    getCategories().then(setCategories)
    getSpendingSummary().then(setSummary)
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const result = await uploadReceipt(form)
      setUploadResult(result)
      const updated = await getReceipts()
      setReceipts(updated)
      getSpendingSummary().then(setSummary)
    } catch (err) {
      setUploadResult({ error: err?.response?.data?.detail || 'Upload failed' })
    }
    setUploading(false)
  }

  const startEdit = (r) => {
    setEditId(r.id)
    setEditData({ merchant: r.merchant, amount: r.amount, currency: r.currency,
                  date: r.date, category: r.category, notes: r.notes })
  }

  const saveEdit = async (id) => {
    await updateReceipt(id, editData)
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...editData } : r))
    setEditId(null)
    getSpendingSummary().then(setSummary)
  }

  const remove = async (id) => {
    if (!confirm('Delete this receipt?')) return
    await deleteReceipt(id)
    setReceipts(prev => prev.filter(r => r.id !== id))
    getSpendingSummary().then(setSummary)
  }

  return (
    <div>
      <h2 className="module-header">🧾 Receipt Tracker</h2>
      <p className="module-subtitle">Upload, categorise, and track your expenses.</p>

      {/* Tabs */}
      <div className="flex gap-1 bg-mist-100 rounded-xl p-1 mb-6">
        {[['list','Receipts'],['upload','Upload'],['summary','Summary']].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all ${
              view === v ? 'bg-white shadow text-flow-700' : 'text-mist-500 hover:text-mist-700'
            }`}>{l}</button>
        ))}
      </div>

      {/* Upload tab */}
      {view === 'upload' && (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-mist-300 rounded-xl p-10 text-center cursor-pointer hover:border-flow-400 hover:bg-flow-50 transition-all"
          >
            <Upload size={32} className="mx-auto mb-3 text-mist-400" />
            <p className="text-mist-600 font-medium">Click to upload receipt</p>
            <p className="text-xs text-mist-400 mt-1">PDF, PNG, JPG, JPEG supported</p>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden" onChange={handleUpload} />
          </div>

          {uploading && (
            <div className="mt-4 p-4 bg-flow-50 rounded-xl text-flow-700 text-sm animate-pulse">
              🔍 Extracting text and parsing receipt…
            </div>
          )}

          {uploadResult && !uploadResult.error && (
            <div className="mt-4 card">
              <p className="text-sm font-medium text-flow-700 mb-3">✅ Receipt processed!</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-mist-400">Merchant:</span> <span className="font-medium">{uploadResult.merchant}</span></div>
                <div><span className="text-mist-400">Amount:</span> <span className="font-medium">{uploadResult.currency} {uploadResult.amount}</span></div>
                <div><span className="text-mist-400">Date:</span> <span className="font-medium">{uploadResult.date || '—'}</span></div>
              </div>
              <p className="text-xs text-mist-400 mt-3">Review and categorise it in the Receipts tab.</p>
            </div>
          )}

          {uploadResult?.error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
              ❌ {uploadResult.error}
            </div>
          )}
        </div>
      )}

      {/* List tab */}
      {view === 'list' && (
        <div>
          {receipts.length === 0 ? (
            <div className="text-center py-12 text-mist-400">
              <p className="text-3xl mb-3">🧾</p>
              <p>No receipts yet. Upload one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {receipts.map(r => (
                <div key={r.id} className="card p-4">
                  {editId === r.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input" placeholder="Merchant" value={editData.merchant || ''}
                          onChange={e => setEditData(d => ({ ...d, merchant: e.target.value }))} />
                        <input className="input" placeholder="Amount" type="number" value={editData.amount || ''}
                          onChange={e => setEditData(d => ({ ...d, amount: parseFloat(e.target.value) }))} />
                        <input className="input" placeholder="Date" value={editData.date || ''}
                          onChange={e => setEditData(d => ({ ...d, date: e.target.value }))} />
                        <select className="input" value={editData.category || ''}
                          onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}>
                          {categories.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <input className="input" placeholder="Notes" value={editData.notes || ''}
                        onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(r.id)} className="btn-primary"><Check size={14}/> Save</button>
                        <button onClick={() => setEditId(null)} className="btn-secondary"><X size={14}/> Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-mist-800">{r.merchant || 'Unknown'}</span>
                          <span className="tag">{r.category}</span>
                        </div>
                        <div className="text-xs text-mist-400 mt-1">
                          {r.currency} {r.amount?.toFixed(2) || '—'} · {r.date || 'No date'}
                        </div>
                        {r.notes && <p className="text-xs text-mist-500 mt-1">{r.notes}</p>}
                      </div>
                      <button onClick={() => startEdit(r)} className="btn-ghost p-2"><Edit2 size={14}/></button>
                      <button onClick={() => remove(r.id)} className="btn-ghost p-2 text-red-400"><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary tab */}
      {view === 'summary' && (
        <div>
          {summary.length === 0 ? (
            <p className="text-center text-mist-400 py-8">No spending data yet.</p>
          ) : (
            <div className="space-y-3">
              {summary.sort((a, b) => b.total - a.total).map(s => {
                const max = Math.max(...summary.map(x => x.total))
                return (
                  <div key={s.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-mist-700">{s.category}</span>
                      <span className="font-medium text-mist-800">€{s.total.toFixed(2)} <span className="text-mist-400 font-normal">({s.count})</span></span>
                    </div>
                    <div className="w-full bg-mist-100 rounded-full h-2">
                      <div className="bg-flow-500 h-2 rounded-full"
                        style={{ width: `${(s.total / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="pt-3 border-t border-mist-200 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>€{summary.reduce((a, b) => a + b.total, 0).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
