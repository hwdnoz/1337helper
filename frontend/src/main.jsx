import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import AdminPage from './AdminPage'
import MetricsDatabaseView from './MetricsDatabaseView'
import CacheDatabaseView from './CacheDatabaseView'
import Login from './Login'
import ProtectedRoute from './ProtectedRoute'

function AppWithAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AdminPage onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/metrics-database"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <MetricsDatabaseView onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cache-database"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <CacheDatabaseView onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppWithAuth />)
