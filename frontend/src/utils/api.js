import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export default api

// ── Settings ────────────────────────────────────────────────────────────────
export const getSettings    = ()       => api.get('/settings').then(r => r.data)
export const updateSettings = (data)   => api.patch('/settings', data).then(r => r.data)

// ── Intention ────────────────────────────────────────────────────────────────
export const getInspiration    = ()       => api.get('/intention/inspiration').then(r => r.data)
export const getTodayIntention = (type)   => api.get(`/intention/today?tour_type=${type}`).then(r => r.data)
export const saveIntention     = (data)   => api.post('/intention', data).then(r => r.data)
export const getIntentionHistory = (limit) => api.get(`/intention/history?limit=${limit || 90}`).then(r => r.data)
export const getIntentionStats   = ()     => api.get('/intention/history/stats').then(r => r.data)

// ── Todo ─────────────────────────────────────────────────────────────────────
export const getTodos     = ()        => api.get('/todo').then(r => r.data)
export const createTodo   = (data)    => api.post('/todo', data).then(r => r.data)
export const updateTodo   = (id, d)   => api.patch(`/todo/${id}`, d).then(r => r.data)
export const deleteTodo   = (id)      => api.delete(`/todo/${id}`).then(r => r.data)
export const reorderTodos = (ids)     => api.post('/todo/reorder', { ids }).then(r => r.data)

// ── Notes ─────────────────────────────────────────────────────────────────────
export const getNotes     = (params)  => api.get('/notes', { params }).then(r => r.data)
export const getNote      = (id)      => api.get(`/notes/${id}`).then(r => r.data)
export const createNote   = (data)    => api.post('/notes', data).then(r => r.data)
export const updateNote   = (id, d)   => api.patch(`/notes/${id}`, d).then(r => r.data)
export const deleteNote   = (id)      => api.delete(`/notes/${id}`).then(r => r.data)
export const getAllTags    = ()        => api.get('/notes/tags/all').then(r => r.data)

// ── Receipts ─────────────────────────────────────────────────────────────────
export const getReceipts      = (params) => api.get('/receipts', { params }).then(r => r.data)
export const getCategories    = ()       => api.get('/receipts/categories').then(r => r.data)
export const uploadReceipt    = (form)   => api.post('/receipts/upload', form, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data)
export const updateReceipt    = (id, d)  => api.patch(`/receipts/${id}`, d).then(r => r.data)
export const deleteReceipt    = (id)     => api.delete(`/receipts/${id}`).then(r => r.data)
export const getSpendingSummary = ()     => api.get('/receipts/summary').then(r => r.data)

// ── Contacts ─────────────────────────────────────────────────────────────────
export const getContacts          = (params) => api.get('/contacts', { params }).then(r => r.data)
export const getUpcomingBirthdays = (days)   => api.get(`/contacts/birthdays/upcoming?days=${days || 30}`).then(r => r.data)
export const createContact        = (data)   => api.post('/contacts', data).then(r => r.data)
export const updateContact        = (id, d)  => api.patch(`/contacts/${id}`, d).then(r => r.data)
export const deleteContact        = (id)     => api.delete(`/contacts/${id}`).then(r => r.data)
export const importVcf            = (form)   => api.post('/contacts/import/vcf', form, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data)

// ── Calendar ─────────────────────────────────────────────────────────────────
export const getCalendarAuthStatus = ()    => api.get('/calendar/auth/status').then(r => r.data)
export const getCalendarAuthUrl    = ()    => api.get('/calendar/auth/url').then(r => r.data)
export const submitCalendarCode    = (c)   => api.post('/calendar/auth/callback', { code: c }).then(r => r.data)
export const getCalendarEvents     = (d)   => api.get(`/calendar/events?days_ahead=${d || 7}`).then(r => r.data)
export const getIcalEvents         = ()    => api.get('/calendar/events/ical').then(r => r.data)
export const importIcal            = (form) => api.post('/calendar/import/ical', form, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(r => r.data)
