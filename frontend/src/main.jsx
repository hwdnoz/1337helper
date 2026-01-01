import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import App from './App'
import AdminPage from './AdminPage'
import MetricsDatabaseView from './MetricsDatabaseView'
import CacheDatabaseView from './CacheDatabaseView'
import Login from './Login'
import ProtectedRoute from './ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { initPerformanceMonitoring, trackLongTasks } from './utils/performanceMonitoring'
import { analytics } from './utils/analytics'

// Component to track route changes
function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location]);

  return null;
}

function AppWithAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
    analytics.trackEvent('user_login');
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    analytics.trackEvent('user_logout');
  }

  // Initialize performance monitoring on mount
  useEffect(() => {
    initPerformanceMonitoring();
    trackLongTasks();

    // Track initial page view
    analytics.trackPageView(window.location.pathname);

    // Track session start
    analytics.trackEvent('session_start');

    // Track session end on unload
    return () => {
      analytics.trackEvent('session_end');
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <RouteTracker />
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
    </ErrorBoundary>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<AppWithAuth />)
