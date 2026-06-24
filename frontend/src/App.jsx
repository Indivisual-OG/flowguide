import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TourPage from './components/TourPage.jsx'
import DashboardPage from './components/DashboardPage.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import HistoryPage from './components/HistoryPage.jsx'
import Sidebar from './components/layout/Sidebar.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-mist-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"          element={<DashboardPage />} />
            <Route path="/tour"      element={<TourPage />} />
            <Route path="/history"   element={<HistoryPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
            <Route path="*"          element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
