import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp, Flame, Star, Zap, Calendar } from 'lucide-react'
import { getIntentionHistory, getIntentionStats } from '../utils/api.js'

const MOOD_LABELS  = { 1: '😔 Low',   2: '😕 Meh',   3: '😐 OK',    4: '🙂 Good',  5: '😄 Great' }
const ENERGY_LABELS = { 1: '🪫 Empty', 2: '😴 Tired', 3: '⚡️ Steady', 4: '🔥 High',  5: '🚀 Peak'  }
const MOOD_COLORS  = { 1: '#f87171', 2: '#fb923c', 3: '#facc15', 4: '#86efac', 5: '#4ade80' }

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-mist-400 font-medium">{label}</p>
        <p className="text-2xl font-semibold text-mist-800">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function MoodDot({ value }) {
  if (!value) return <span className="text-mist-300 text-xs">—</span>
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: MOOD_COLORS[value] + '33', color: MOOD_COLORS[value] }}
    >
      {MOOD_LABELS[value]}
    </span>
  )
}

function EntryCard({ entry }) {
  const [open, setOpen] = useState(false)
  const isMorning = entry.tour_type === 'morning'

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-mist-50 transition-colors"
      >
        {/* Tour type indicator */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base
          ${isMorning ? 'bg-amber-100' : 'bg-indigo-100'}`}>
          {isMorning ? '🌅' : '🌆'}
        </div>

        {/* Date + type */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-mist-800">
            {format(parseISO(entry.date), 'EEEE, MMMM do')}
          </p>
          <p className="text-xs text-mist-400 capitalize">{entry.tour_type} tour</p>
        </div>

        {/* Mood + energy chips */}
        <div className="flex items-center gap-2 shrink-0">
          <MoodDot value={entry.mood} />
          {entry.energy && (
            <span className="text-xs text-mist-400">{ENERGY_LABELS[entry.energy]}</span>
          )}
        </div>

        {/* Expand toggle */}
        <div className="text-mist-300 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (entry.intention || entry.reflection) && (
        <div className="px-4 pb-4 space-y-3 border-t border-mist-100 pt-3">
          {entry.intention && (
            <div>
              <p className="text-xs text-mist-400 font-medium mb-1">
                {isMorning ? '🎯 Intention' : '💭 Reflection on the day'}
              </p>
              <p className="text-sm text-mist-700 leading-relaxed">{entry.intention}</p>
            </div>
          )}
          {entry.reflection && (
            <div>
              <p className="text-xs text-mist-400 font-medium mb-1">💭 Evening reflection</p>
              <p className="text-sm text-mist-700 leading-relaxed">{entry.reflection}</p>
            </div>
          )}
        </div>
      )}
      {open && !entry.intention && !entry.reflection && (
        <div className="px-4 pb-4 pt-3 border-t border-mist-100">
          <p className="text-xs text-mist-400 italic">No notes recorded for this entry.</p>
        </div>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-mist-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-mist-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}/5
        </p>
      ))}
    </div>
  )
}

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [stats, setStats]     = useState(null)
  const [filter, setFilter]   = useState('all')   // all | morning | evening
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getIntentionHistory(90), getIntentionStats()]).then(([h, s]) => {
      setHistory(h)
      setStats(s)
      setLoading(false)
    })
  }, [])

  const filtered = history.filter(e =>
    filter === 'all' || e.tour_type === filter
  )

  // Build chart data — one point per unique date, average morning+evening if both exist
  const chartData = (() => {
    const byDate = {}
    history.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = { date: e.date, moodVals: [], energyVals: [] }
      if (e.mood)   byDate[e.date].moodVals.push(e.mood)
      if (e.energy) byDate[e.date].energyVals.push(e.energy)
    })
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)   // last 30 days
      .map(d => ({
        date: format(parseISO(d.date), 'MMM d'),
        mood:   d.moodVals.length   ? Math.round(d.moodVals.reduce((a,b)=>a+b,0)   / d.moodVals.length   * 10) / 10 : null,
        energy: d.energyVals.length ? Math.round(d.energyVals.reduce((a,b)=>a+b,0) / d.energyVals.length * 10) / 10 : null,
      }))
      .filter(d => d.mood !== null || d.energy !== null)
  })()

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-mist-400 animate-pulse">Loading history…</p>
    </div>
  )

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display text-flow-800 mb-1">History</h1>
      <p className="text-mist-500 text-sm mb-8">Your daily tour journal — mood, energy, intentions and reflections.</p>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          <StatCard icon={Calendar} label="Total Tours"   value={stats.total_entries}  color="bg-flow-500" />
          <StatCard icon={Flame}    label="Day Streak"    value={`${stats.streak_days}d`} color="bg-amber-400" />
          <StatCard icon={Star}     label="Avg Mood"      value={stats.avg_mood}        color="bg-purple-400" />
          <StatCard icon={Zap}      label="Avg Energy"    value={stats.avg_energy}      color="bg-blue-400" />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card mb-8">
          <p className="text-sm font-semibold text-mist-600 mb-4">📈 Mood & Energy — last 30 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#adb5bd' }} />
              <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 11, fill: '#adb5bd' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone" dataKey="mood" name="Mood"
                stroke="#5ab38c" strokeWidth={2} dot={{ r: 3, fill: '#5ab38c' }}
                connectNulls activeDot={{ r: 5 }}
              />
              <Line
                type="monotone" dataKey="energy" name="Energy"
                stroke="#818cf8" strokeWidth={2} dot={{ r: 3, fill: '#818cf8' }}
                connectNulls activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-mist-100 rounded-xl p-1 mb-5">
        {[['all','All Tours'],['morning','🌅 Morning'],['evening','🌆 Evening']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all ${
              filter === v ? 'bg-white shadow text-flow-700' : 'text-mist-500 hover:text-mist-700'
            }`}>{l}</button>
        ))}
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-mist-400">
          <p className="text-4xl mb-4">🌱</p>
          <p className="font-medium mb-1">No entries yet</p>
          <p className="text-sm">Complete a tour to start building your history.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
