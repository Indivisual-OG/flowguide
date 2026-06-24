import React, { useState, useEffect } from 'react'
import { Save, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import { getSettings, updateSettings } from '../utils/api.js'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  KeyboardSensor
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const ALL_MODULES = [
  { id: 'intention', label: 'Intention & Mindfulness', emoji: '🧘', description: 'Daily intention, mood check-in, breathing exercises' },
  { id: 'calendar',  label: 'Calendar',                emoji: '🗓️', description: 'Google Calendar & iCal integration' },
  { id: 'todo',      label: 'To-Do List',              emoji: '✅', description: 'Drag-and-drop task management' },
  { id: 'notepad',   label: 'Knowledge Notepad',       emoji: '📓', description: 'Tagged notes and personal knowledge base' },
  { id: 'receipts',  label: 'Receipt Tracker',         emoji: '🧾', description: 'Upload receipts, OCR extraction, spending summary' },
  { id: 'contacts',  label: 'Contacts & Birthdays',    emoji: '🎂', description: 'Contact book with birthday reminders' },
]

function SortableModule({ mod, enabled, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: mod.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
        enabled ? 'bg-white border-mist-200' : 'bg-mist-50 border-mist-100 opacity-60'
      }`}>
      <button {...attributes} {...listeners} className="text-mist-300 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <span className="text-xl">{mod.emoji}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-mist-800">{mod.label}</p>
        <p className="text-xs text-mist-400">{mod.description}</p>
      </div>
      <button onClick={() => onToggle(mod.id)}>
        {enabled
          ? <ToggleRight size={24} className="text-flow-500" />
          : <ToggleLeft  size={24} className="text-mist-300" />
        }
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings]   = useState(null)
  const [moduleOrder, setModuleOrder] = useState([])
  const [enabled, setEnabled]     = useState(new Set())
  const [morningTime, setMorningTime] = useState('08:00')
  const [eveningTime, setEveningTime] = useState('17:30')
  const [morningOn, setMorningOn] = useState(true)
  const [eveningOn, setEveningOn] = useState(true)
  const [saved, setSaved]         = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s)
      const order = s.module_order || ALL_MODULES.map(m => m.id)
      setModuleOrder(order)
      setEnabled(new Set(s.enabled_modules || order))
      setMorningTime(s.morning_time || '08:00')
      setEveningTime(s.evening_time || '17:30')
      setMorningOn(s.morning_enabled !== 'false')
      setEveningOn(s.evening_enabled !== 'false')
    })
  }, [])

  const toggleModule = (id) => {
    setEnabled(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = moduleOrder.indexOf(active.id)
    const newIdx = moduleOrder.indexOf(over.id)
    setModuleOrder(prev => arrayMove(prev, oldIdx, newIdx))
  }

  const save = async () => {
    await updateSettings({
      module_order: moduleOrder,
      enabled_modules: [...enabled],
      morning_time: morningTime,
      evening_time: eveningTime,
      morning_enabled: morningOn ? 'true' : 'false',
      evening_enabled: eveningOn ? 'true' : 'false',
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return <div className="p-8 text-mist-400">Loading…</div>

  const orderedModules = moduleOrder
    .map(id => ALL_MODULES.find(m => m.id === id))
    .filter(Boolean)

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display text-flow-800 mb-1">Settings</h1>
      <p className="text-mist-500 text-sm mb-8">Customise your FlowGuide tour and modules.</p>

      {/* Tour schedule */}
      <section className="card mb-6">
        <h2 className="text-base font-semibold text-mist-700 mb-4">⏰ Tour Schedule</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-mist-700">🌅 Morning Tour</p>
              <p className="text-xs text-mist-400">Opens automatically at this time</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="time" value={morningTime} onChange={e => setMorningTime(e.target.value)}
                disabled={!morningOn}
                className="input w-32 disabled:opacity-40" />
              <button onClick={() => setMorningOn(v => !v)}>
                {morningOn
                  ? <ToggleRight size={24} className="text-flow-500" />
                  : <ToggleLeft  size={24} className="text-mist-300" />
                }
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-mist-700">🌆 Evening Tour</p>
              <p className="text-xs text-mist-400">Opens automatically at this time</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="time" value={eveningTime} onChange={e => setEveningTime(e.target.value)}
                disabled={!eveningOn}
                className="input w-32 disabled:opacity-40" />
              <button onClick={() => setEveningOn(v => !v)}>
                {eveningOn
                  ? <ToggleRight size={24} className="text-flow-500" />
                  : <ToggleLeft  size={24} className="text-mist-300" />
                }
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-mist-50 rounded-lg text-xs text-mist-500">
          💡 Run <code className="bg-mist-200 px-1 rounded">flowguide-scheduler</code> as a background service to enable auto-launch.
          See the <code>scheduler/</code> folder for the setup script.
        </div>
      </section>

      {/* Module manager */}
      <section className="card mb-6">
        <h2 className="text-base font-semibold text-mist-700 mb-1">🧩 Modules</h2>
        <p className="text-xs text-mist-400 mb-4">Drag to reorder · Toggle to enable/disable</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={moduleOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderedModules.map(mod => (
                <SortableModule
                  key={mod.id}
                  mod={mod}
                  enabled={enabled.has(mod.id)}
                  onToggle={toggleModule}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      {/* Save */}
      <button onClick={save} className="btn-primary w-full justify-center text-base py-3">
        <Save size={16} />
        {saved ? '✓ Settings Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
