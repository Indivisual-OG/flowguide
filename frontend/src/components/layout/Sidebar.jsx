import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Play, History, Settings, Leaf
} from 'lucide-react'

const navItems = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tour',    label: 'Start Tour', icon: Play },
  { to: '/history', label: 'History',   icon: History },
  { to: '/settings',label: 'Settings',  icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-mist-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-mist-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-flow-600 rounded-lg flex items-center justify-center">
            <Leaf size={16} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-flow-800 tracking-tight">FlowGuide</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-flow-50 text-flow-700 border border-flow-200'
                  : 'text-mist-600 hover:bg-mist-100 hover:text-mist-800'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-mist-100">
        <p className="text-xs text-mist-400">FlowGuide v1.0</p>
      </div>
    </aside>
  )
}
