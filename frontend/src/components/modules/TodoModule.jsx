import React, { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, CheckSquare, Square } from 'lucide-react'
import { getTodos, createTodo, updateTodo, deleteTodo, reorderTodos } from '../../utils/api.js'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const PRIORITY_COLORS = {
  low:    'bg-mist-100 text-mist-500',
  normal: 'bg-blue-100 text-blue-600',
  high:   'bg-red-100 text-red-600',
}

function SortableTodo({ item, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        item.completed ? 'bg-mist-50 border-mist-100 opacity-60' : 'bg-white border-mist-200'
      }`}>
      <button {...attributes} {...listeners} className="text-mist-300 cursor-grab active:cursor-grabbing">
        <GripVertical size={15} />
      </button>
      <button onClick={() => onToggle(item)}>
        {item.completed
          ? <CheckSquare size={18} className="text-flow-500" />
          : <Square size={18} className="text-mist-300" />
        }
      </button>
      <span className={`flex-1 text-sm ${item.completed ? 'line-through text-mist-400' : 'text-mist-800'}`}>
        {item.text}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.normal}`}>
        {item.priority}
      </span>
      <button onClick={() => onDelete(item.id)} className="text-mist-300 hover:text-red-400 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function TodoModule({ onComplete }) {
  const [todos, setTodos]       = useState([])
  const [text, setText]         = useState('')
  const [priority, setPriority] = useState('normal')
  const [loading, setLoading]   = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    getTodos().then(data => { setTodos(data); setLoading(false) })
  }, [])

  const add = async () => {
    if (!text.trim()) return
    const item = await createTodo({ text: text.trim(), priority })
    setTodos(prev => [...prev, item])
    setText('')
  }

  const toggle = async (item) => {
    await updateTodo(item.id, { completed: !item.completed })
    setTodos(prev => prev.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t))
  }

  const remove = async (id) => {
    await deleteTodo(id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = todos.findIndex(t => t.id === active.id)
    const newIdx = todos.findIndex(t => t.id === over.id)
    const newOrder = arrayMove(todos, oldIdx, newIdx)
    setTodos(newOrder)
    await reorderTodos(newOrder.map(t => t.id))
  }

  const pending   = todos.filter(t => !t.completed)
  const done      = todos.filter(t => t.completed)

  return (
    <div>
      <h2 className="module-header">✅ To-Do List</h2>
      <p className="module-subtitle">Review, add, and tick off tasks.</p>

      {/* Add task */}
      <div className="flex gap-2 mb-6">
        <input
          className="input flex-1"
          placeholder="Add a task…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="input w-28"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <button onClick={add} className="btn-primary">
          <Plus size={16} /> Add
        </button>
      </div>

      {loading ? (
        <p className="text-mist-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-mist-500 font-medium mb-2 uppercase tracking-wide">
                Pending ({pending.length})
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pending.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {pending.map(item => (
                      <SortableTodo key={item.id} item={item} onToggle={toggle} onDelete={remove} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div>
              <p className="text-xs text-mist-500 font-medium mb-2 uppercase tracking-wide">
                Completed ({done.length})
              </p>
              <div className="space-y-2">
                {done.map(item => (
                  <SortableTodo key={item.id} item={item} onToggle={toggle} onDelete={remove} />
                ))}
              </div>
            </div>
          )}

          {todos.length === 0 && (
            <div className="text-center py-12 text-mist-400">
              <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p>No tasks yet. Add one above!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
