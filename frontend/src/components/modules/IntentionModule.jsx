import React, { useState, useEffect, useRef } from 'react'
import { Wind, Sun, Moon, Flame } from 'lucide-react'
import { getInspiration, getTodayIntention, saveIntention } from '../../utils/api.js'

const MOODS = ['😔','😕','😐','🙂','😄']
const ENERGIES = ['🪫','😴','⚡️','🔥','🚀']

export default function IntentionModule({ tourType, onComplete }) {
  const [insp, setInsp]           = useState(null)
  const [intention, setIntention] = useState('')
  const [mood, setMood]           = useState(null)
  const [energy, setEnergy]       = useState(null)
  const [saved, setSaved]         = useState(false)
  const [breathActive, setBreath] = useState(false)
  const [breathStep, setBreathStep] = useState('')
  const [breathTimer, setBreathTimer] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    getInspiration().then(setInsp)
    getTodayIntention(tourType).then(d => {
      if (d.intention) setIntention(d.intention)
      if (d.mood)      setMood(d.mood)
      if (d.energy)    setEnergy(d.energy)
    })
  }, [tourType])

  const save = async () => {
    await saveIntention({ tour_type: tourType, intention, mood, energy })
    setSaved(true)
    onComplete?.()
  }

  const startBreathing = () => {
    if (breathActive) {
      clearInterval(intervalRef.current)
      setBreath(false)
      setBreathStep('')
      return
    }
    setBreath(true)
    // Box breathing: 4-4-4-4
    const steps = [
      { label: 'Inhale…',  dur: 4000 },
      { label: 'Hold…',    dur: 4000 },
      { label: 'Exhale…',  dur: 4000 },
      { label: 'Hold…',    dur: 4000 },
    ]
    let i = 0
    const run = () => {
      setBreathStep(steps[i].label)
      i = (i + 1) % steps.length
    }
    run()
    intervalRef.current = setInterval(run, 4000)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const isMorning = tourType === 'morning'

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        {isMorning ? <Sun className="text-amber-400" size={22} /> : <Moon className="text-indigo-400" size={22} />}
        <h2 className="module-header">
          {isMorning ? 'Good Morning 🌱' : 'Wind Down 🌙'}
        </h2>
      </div>
      <p className="module-subtitle">
        {isMorning ? 'Set your intention and arrive into your day.' : 'Reflect and let go of the day.'}
      </p>

      {/* Quote */}
      {insp && (
        <div className="bg-flow-50 border border-flow-200 rounded-xl px-5 py-4 mb-6 italic text-flow-700 text-sm">
          "{insp.quote}"
        </div>
      )}

      {/* Mood & Energy */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-mist-500 mb-2 font-medium">How are you feeling?</p>
          <div className="flex gap-2">
            {MOODS.map((m, i) => (
              <button key={i} onClick={() => setMood(i + 1)}
                className={`text-xl transition-transform ${mood === i+1 ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-mist-500 mb-2 font-medium">Energy level?</p>
          <div className="flex gap-2">
            {ENERGIES.map((e, i) => (
              <button key={i} onClick={() => setEnergy(i + 1)}
                className={`text-xl transition-transform ${energy === i+1 ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Intention */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-mist-700 mb-2">
          {isMorning ? '🎯 My intention for today…' : '💭 My reflection on today…'}
        </label>
        <textarea
          className="textarea h-24"
          placeholder={isMorning
            ? "I intend to focus on… / Today I will…"
            : "What went well? What would I change?"
          }
          value={intention}
          onChange={e => setIntention(e.target.value)}
        />
      </div>

      {/* Breathing exercise */}
      {insp && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-mist-700">{insp.breathing.name}</p>
              <p className="text-xs text-mist-400">{insp.breathing.description}</p>
            </div>
            <button onClick={startBreathing}
              className={`btn text-sm ${breathActive ? 'btn-danger' : 'btn-secondary'}`}>
              <Wind size={14} />
              {breathActive ? 'Stop' : 'Start'}
            </button>
          </div>
          {breathActive && (
            <div className="mt-3 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-flow-100 border-4 border-flow-300 flex items-center justify-center text-sm font-medium text-flow-600 animate-breathe">
                {breathStep}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Yoga suggestion */}
      {insp && (
        <div className="bg-mist-50 border border-mist-200 rounded-xl p-4 mb-6">
          <p className="text-xs text-mist-500 font-medium mb-1">🧘 Movement suggestion</p>
          <p className="text-sm font-medium text-mist-700">{insp.yoga.name} <span className="text-mist-400">— {insp.yoga.duration}</span></p>
          <p className="text-xs text-mist-500 mt-1">{insp.yoga.description}</p>
        </div>
      )}

      <button
        onClick={save}
        className={`btn-primary w-full justify-center ${saved ? 'opacity-70' : ''}`}
        disabled={saved}
      >
        {saved ? '✓ Saved' : 'Save & Continue'}
      </button>
    </div>
  )
}
