import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, SkipForward, X, Check } from 'lucide-react'
import { getSettings } from '../utils/api.js'
import IntentionModule    from './modules/IntentionModule.jsx'
import TodoModule         from './modules/TodoModule.jsx'
import NotepadModule      from './modules/NotepadModule.jsx'
import ReceiptsModule     from './modules/ReceiptsModule.jsx'
import ContactsModule     from './modules/ContactsModule.jsx'
import CalendarModule     from './modules/CalendarModule.jsx'

const MODULE_MAP = {
  intention: { label: 'Intention',  emoji: '🧘', component: IntentionModule },
  calendar:  { label: 'Calendar',   emoji: '🗓️', component: CalendarModule },
  todo:      { label: 'To-Do',      emoji: '✅', component: TodoModule },
  notepad:   { label: 'Notepad',    emoji: '📓', component: NotepadModule },
  receipts:  { label: 'Receipts',   emoji: '🧾', component: ReceiptsModule },
  contacts:  { label: 'Contacts',   emoji: '🎂', component: ContactsModule },
}

export default function TourPage() {
  const [modules, setModules]     = useState([])
  const [current, setCurrent]     = useState(0)
  const [completed, setCompleted] = useState(new Set())
  const [tourType, setTourType]   = useState('morning')
  const [finished, setFinished]   = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    getSettings().then(s => {
      const enabled = s.enabled_modules || []
      const order   = (s.module_order || []).filter(m => enabled.includes(m))
      setModules(order)
      // Determine tour type by time
      const hour = new Date().getHours()
      setTourType(hour < 13 ? 'morning' : 'evening')
      setLoading(false)
    })
  }, [])

  const module = modules[current]
  const info   = module ? MODULE_MAP[module] : null
  const Component = info?.component

  const markCompleted = () => setCompleted(prev => new Set([...prev, module]))

  const goNext = () => {
    markCompleted()
    if (current < modules.length - 1) setCurrent(c => c + 1)
    else setFinished(true)
  }

  const goPrev = () => {
    if (current > 0) setCurrent(c => c - 1)
  }

  const skip = () => {
    if (current < modules.length - 1) setCurrent(c => c + 1)
    else setFinished(true)
  }

  const progress = modules.length ? ((current) / modules.length) * 100 : 0

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-flow-500 text-lg">Loading your tour…</div>
    </div>
  )

  if (finished) return <TourComplete modules={modules} completed={completed} />

  if (!module || !Component) return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="card text-center max-w-md">
        <p className="text-mist-500 mb-4">No modules enabled. Add modules in Settings.</p>
        <a href="/settings" className="btn-primary">Go to Settings</a>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Progress bar */}
      <div className="bg-white border-b border-mist-200 px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {modules.map((m, i) => {
              const mi = MODULE_MAP[m]
              return (
                <button
                  key={m}
                  onClick={() => setCurrent(i)}
                  title={mi?.label}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                    i === current
                      ? 'bg-flow-600 text-white shadow'
                      : completed.has(m)
                      ? 'bg-flow-100 text-flow-600'
                      : 'bg-mist-100 text-mist-400'
                  }`}
                >
                  {mi?.emoji}
                </button>
              )
            })}
          </div>
          <span className="text-xs text-mist-400 font-medium">
            {current + 1} / {modules.length}
          </span>
        </div>
        <div className="w-full bg-mist-200 rounded-full h-1.5">
          <div
            className="bg-flow-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Module content */}
      <div className="flex-1 overflow-auto p-6 max-w-3xl w-full mx-auto">
        <div className="animate-slide-up">
          <Component tourType={tourType} onComplete={markCompleted} />
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-mist-200 px-6 py-4 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <button onClick={skip} className="btn-ghost text-sm">
          <SkipForward size={15} /> Skip
        </button>

        <button onClick={goNext} className="btn-primary">
          {current < modules.length - 1 ? (
            <><Check size={16} /> Done & Next <ChevronRight size={16} /></>
          ) : (
            <><Check size={16} /> Finish Tour</>
          )}
        </button>
      </div>
    </div>
  )
}

function TourComplete({ modules, completed }) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="card text-center max-w-md animate-slide-up">
        <div className="text-5xl mb-4">🌿</div>
        <h1 className="text-2xl font-display text-flow-800 mb-2">Tour Complete</h1>
        <p className="text-mist-500 mb-6">
          You completed {completed.size} of {modules.length} modules. Great work!
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/" className="btn-secondary">Back to Dashboard</a>
          <a href="/tour" className="btn-primary" onClick={() => window.location.reload()}>
            Restart Tour
          </a>
        </div>
      </div>
    </div>
  )
}
