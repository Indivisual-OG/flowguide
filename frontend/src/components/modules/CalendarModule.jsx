import React, { useState, useEffect, useRef } from 'react'
import { RefreshCw, Upload, ExternalLink, Calendar, Clock } from 'lucide-react'
import {
  getCalendarAuthStatus, getCalendarAuthUrl, submitCalendarCode,
  getCalendarEvents, getIcalEvents, importIcal
} from '../../utils/api.js'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'

function EventCard({ event }) {
  const startDate = event.start ? (event.all_day ? event.start : parseISO(event.start)) : null
  const label = startDate
    ? isToday(startDate) ? 'Today'
    : isTomorrow(startDate) ? 'Tomorrow'
    : format(startDate, 'EEE, MMM d')
    : ''

  return (
    <div className="flex gap-3 p-3 bg-white border border-mist-200 rounded-xl hover:border-flow-300 transition-all">
      <div className="w-1 bg-flow-400 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-mist-800 truncate">{event.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-mist-400">
          <Calendar size={11} />
          <span>{label}</span>
          {!event.all_day && startDate && (
            <><Clock size={11} /><span>{format(startDate, 'HH:mm')}</span></>
          )}
          {event.location && <span>📍 {event.location}</span>}
        </div>
      </div>
    </div>
  )
}

export default function CalendarModule({ onComplete }) {
  const [authStatus, setAuthStatus] = useState(null)
  const [authUrl, setAuthUrl]       = useState('')
  const [authCode, setAuthCode]     = useState('')
  const [events, setEvents]         = useState([])
  const [icalEvents, setIcalEvents] = useState([])
  const [loading, setLoading]       = useState(true)
  const [source, setSource]         = useState('google')  // google | ical
  const [icalImporting, setIcalImporting] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    getCalendarAuthStatus().then(s => {
      setAuthStatus(s)
      if (s.authenticated) {
        getCalendarEvents(7).then(r => { setEvents(r.events || []); setLoading(false) })
      } else {
        setLoading(false)
      }
    })
    getIcalEvents().then(r => setIcalEvents(r.events || []))
  }, [])

  const startAuth = async () => {
    try {
      const r = await getCalendarAuthUrl()
      setAuthUrl(r.auth_url)
      window.open(r.auth_url, '_blank')
    } catch (err) {
      alert(err?.response?.data?.detail || 'Could not get auth URL')
    }
  }

  const submitCode = async () => {
    try {
      await submitCalendarCode(authCode)
      const s = await getCalendarAuthStatus()
      setAuthStatus(s)
      if (s.authenticated) {
        const r = await getCalendarEvents(7)
        setEvents(r.events || [])
      }
    } catch (err) {
      alert('Authentication failed: ' + (err?.response?.data?.detail || err.message))
    }
  }

  const handleIcalUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIcalImporting(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const r = await importIcal(form)
      setIcalEvents(r.events || [])
      setSource('ical')
    } catch (err) {
      alert('Failed to import: ' + (err?.response?.data?.detail || err.message))
    }
    setIcalImporting(false)
  }

  const displayEvents = source === 'google' ? events : icalEvents

  return (
    <div>
      <h2 className="module-header">🗓️ Calendar</h2>
      <p className="module-subtitle">Your upcoming events at a glance.</p>

      {/* Source toggle */}
      <div className="flex gap-1 bg-mist-100 rounded-xl p-1 mb-5">
        {[['google','Google Calendar'],['ical','iCal / Outlook']].map(([v,l]) => (
          <button key={v} onClick={() => setSource(v)}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all ${
              source === v ? 'bg-white shadow text-flow-700' : 'text-mist-500 hover:text-mist-700'
            }`}>{l}</button>
        ))}
      </div>

      {/* Google Calendar section */}
      {source === 'google' && (
        <div>
          {loading ? (
            <p className="text-mist-400 text-sm animate-pulse">Loading events…</p>
          ) : !authStatus?.authenticated ? (
            <div className="card text-center">
              <Calendar size={40} className="mx-auto mb-3 text-mist-300" />
              <p className="text-mist-600 mb-4">Connect your Google Calendar to see events here.</p>

              {!authStatus?.has_credentials_file ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-4">
                  <p className="text-sm font-medium text-amber-700 mb-1">Setup required</p>
                  <p className="text-xs text-amber-600">
                    Place your <code>credentials.json</code> from Google Cloud Console at:<br/>
                    <code className="bg-amber-100 px-1 rounded">~/.flowguide/google_credentials.json</code>
                  </p>
                </div>
              ) : (
                <>
                  <button onClick={startAuth} className="btn-primary mb-4">
                    <ExternalLink size={14} /> Connect Google Calendar
                  </button>
                  {authUrl && (
                    <div className="mt-3">
                      <p className="text-sm text-mist-600 mb-2">Paste the code from the browser:</p>
                      <div className="flex gap-2">
                        <input className="input flex-1" placeholder="Auth code…"
                          value={authCode} onChange={e => setAuthCode(e.target.value)} />
                        <button onClick={submitCode} className="btn-primary">Connect</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-xs text-mist-500 font-medium uppercase tracking-wide">
                  Next 7 days ({events.length} event{events.length !== 1 ? 's' : ''})
                </p>
                <button onClick={() => getCalendarEvents(7).then(r => setEvents(r.events || []))}
                  className="btn-ghost p-1.5"><RefreshCw size={13}/></button>
              </div>
              {events.length === 0 ? (
                <p className="text-center text-mist-400 py-8">No events in the next 7 days. 🎉</p>
              ) : (
                <div className="space-y-2">
                  {events.map(e => <EventCard key={e.id} event={e} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* iCal section */}
      {source === 'ical' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-mist-500">Import an .ics file from Outlook, Apple Calendar, or any service.</p>
            <button onClick={() => fileRef.current?.click()}
              className="btn-secondary text-sm" disabled={icalImporting}>
              <Upload size={14} /> {icalImporting ? 'Importing…' : 'Import .ics'}
            </button>
            <input ref={fileRef} type="file" accept=".ics" className="hidden" onChange={handleIcalUpload} />
          </div>

          {icalEvents.length === 0 ? (
            <div className="text-center py-12 text-mist-400">
              <p className="text-3xl mb-3">📅</p>
              <p>No iCal events imported yet.</p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-mist-500 font-medium uppercase tracking-wide mb-3">
                Upcoming ({icalEvents.length} events)
              </p>
              <div className="space-y-2">
                {icalEvents.slice(0, 15).map((e, i) => <EventCard key={i} event={e} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
