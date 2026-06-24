import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Sun, Moon, Clock, CheckSquare, StickyNote, Receipt, Users, Calendar, Cake } from 'lucide-react'
import { getSettings, getTodos, getUpcomingBirthdays, getCalendarEvents } from '../utils/api.js'
import { format } from 'date-fns'

export default function DashboardPage() {
  const [settings, setSettings]   = useState(null)
  const [todos, setTodos]         = useState([])
  const [birthdays, setBirthdays] = useState([])
  const [events, setEvents]       = useState([])
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const tourType = hour < 13 ? 'morning' : 'evening'
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    getSettings().then(setSettings)
    getTodos().then(d => setTodos(d.filter(t => !t.completed).slice(0, 5)))
    getUpcomingBirthdays(14).then(setBirthdays)
    getCalendarEvents(3).then(r => setEvents((r.events || []).slice(0, 5))).catch(() => {})
  }, [])

  const pending = todos.filter(t => !t.completed).length

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display text-flow-800 mb-1">
          {greeting} 🌿
        </h1>
        <p className="text-mist-500">
          {format(new Date(), 'EEEE, MMMM do yyyy')}
        </p>
      </div>

      {/* Start Tour CTA */}
      <div className="bg-gradient-to-r from-flow-600 to-flow-500 rounded-2xl p-6 text-white mb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {tourType === 'morning'
                ? <Sun size={18} className="text-amber-300" />
                : <Moon size={18} className="text-indigo-200" />
              }
              <p className="text-flow-100 text-sm font-medium">
                {tourType === 'morning' ? 'Morning Tour' : 'Evening Tour'}
              </p>
            </div>
            <h2 className="text-xl font-semibold">Ready to flow?</h2>
            <p className="text-flow-200 text-sm mt-1">
              {settings?.enabled_modules?.length || 0} modules waiting for you.
            </p>
          </div>
          <button
            onClick={() => navigate('/tour')}
            className="flex items-center gap-2 bg-white text-flow-700 font-semibold px-5 py-3 rounded-xl hover:bg-flow-50 transition-all shadow"
          >
            <Play size={16} fill="currentColor" /> Start Tour
          </button>
        </div>
      </div>

      {/* Widgets grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Schedule */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-mist-400" />
            <p className="text-xs font-semibold text-mist-500 uppercase tracking-wide">Tour Schedule</p>
          </div>
          {settings && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-mist-600">🌅 Morning</span>
                <span className={`font-medium ${settings.morning_enabled === 'true' ? 'text-flow-600' : 'text-mist-400'}`}>
                  {settings.morning_enabled === 'true' ? settings.morning_time : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mist-600">🌆 Evening</span>
                <span className={`font-medium ${settings.evening_enabled === 'true' ? 'text-flow-600' : 'text-mist-400'}`}>
                  {settings.evening_enabled === 'true' ? settings.evening_time : 'Disabled'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pending todos */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare size={15} className="text-mist-400" />
            <p className="text-xs font-semibold text-mist-500 uppercase tracking-wide">
              Pending Tasks ({pending})
            </p>
          </div>
          {todos.length === 0 ? (
            <p className="text-mist-400 text-sm">All done! 🎉</p>
          ) : (
            <div className="space-y-1">
              {todos.slice(0, 4).map(t => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    t.priority === 'high' ? 'bg-red-400' : t.priority === 'low' ? 'bg-mist-300' : 'bg-flow-400'
                  }`} />
                  <span className="text-mist-700 truncate">{t.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Upcoming birthdays */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Cake size={15} className="text-mist-400" />
            <p className="text-xs font-semibold text-mist-500 uppercase tracking-wide">Upcoming Birthdays</p>
          </div>
          {birthdays.length === 0 ? (
            <p className="text-mist-400 text-sm">None in the next 14 days.</p>
          ) : (
            <div className="space-y-1.5">
              {birthdays.slice(0, 4).map(b => (
                <div key={b.id} className="flex justify-between text-sm">
                  <span className="text-mist-700">{b.name}</span>
                  <span className={b.days_until <= 3 ? 'text-amber-500 font-medium' : 'text-mist-400'}>
                    {b.days_until === 0 ? '🎉 Today!' : `${b.days_until}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-mist-400" />
            <p className="text-xs font-semibold text-mist-500 uppercase tracking-wide">Next Events</p>
          </div>
          {events.length === 0 ? (
            <p className="text-mist-400 text-sm">No events or calendar not connected.</p>
          ) : (
            <div className="space-y-1.5">
              {events.slice(0, 4).map(e => (
                <div key={e.id} className="text-sm text-mist-700 truncate">{e.title}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
