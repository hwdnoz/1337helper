import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics } from './utils/analytics';
import './AnalyticsPage.css';

function AnalyticsPage({ onLogout }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [webVitals, setWebVitals] = useState({});
  const [errors, setErrors] = useState([]);
  const [apiCalls, setApiCalls] = useState([]);
  const [storageSize, setStorageSize] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load data
  useEffect(() => {
    loadAnalyticsData();
  }, [refreshKey]);

  const loadAnalyticsData = () => {
    const allEvents = analytics.getAllEvents();
    setEvents(allEvents);

    // Process Web Vitals
    const vitals = {};
    analytics.getEventsByType('web-vital').forEach(event => {
      if (!vitals[event.name]) {
        vitals[event.name] = [];
      }
      vitals[event.name].push({
        value: event.value,
        rating: event.rating,
        timestamp: event.metadata.timestamp,
      });
    });
    setWebVitals(vitals);

    // Process Errors
    const errorEvents = analytics.getEventsByType('error');
    setErrors(errorEvents.slice(-20)); // Last 20 errors

    // Process API Calls
    const apiEvents = analytics.getEventsByName('api_call');
    setApiCalls(apiEvents.slice(-50)); // Last 50 API calls

    // Storage size
    setStorageSize(analytics.getStorageSize());
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all analytics data?')) {
      analytics.clearAllData();
      setRefreshKey(k => k + 1);
    }
  };

  const handleExport = () => {
    analytics.exportData();
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getVitalStats = (name) => {
    const data = webVitals[name] || [];
    if (data.length === 0) return null;

    const values = data.map(d => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = data[data.length - 1];

    return { avg, min, max, latest, count: data.length };
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'good': return '#4caf50';
      case 'needs-improvement': return '#ff9800';
      case 'poor': return '#f44336';
      default: return '#999';
    }
  };

  const getRatingEmoji = (rating) => {
    switch (rating) {
      case 'good': return '✅';
      case 'needs-improvement': return '⚠️';
      case 'poor': return '❌';
      default: return '❓';
    }
  };

  // Group API calls by endpoint
  const getApiStats = () => {
    const stats = {};
    apiCalls.forEach(event => {
      const endpoint = event.metadata.endpoint || 'unknown';
      if (!stats[endpoint]) {
        stats[endpoint] = {
          count: 0,
          totalDuration: 0,
          successes: 0,
          failures: 0,
        };
      }
      stats[endpoint].count++;
      stats[endpoint].totalDuration += event.value;
      if (event.metadata.success) {
        stats[endpoint].successes++;
      } else {
        stats[endpoint].failures++;
      }
    });

    return Object.entries(stats).map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgDuration: Math.round(data.totalDuration / data.count),
      successRate: ((data.successes / data.count) * 100).toFixed(1),
    })).sort((a, b) => b.avgDuration - a.avgDuration);
  };

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1>📊 Performance Analytics</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/admin')} className="btn-secondary">
            ← Back to Admin
          </button>
          <button onClick={handleRefresh} className="btn-secondary">
            🔄 Refresh
          </button>
          <button onClick={handleExport} className="btn-secondary">
            📥 Export JSON
          </button>
          <button onClick={handleClearData} className="btn-danger">
            🗑️ Clear Data
          </button>
          <button onClick={onLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="analytics-stats">
        <div className="stat-card">
          <div className="stat-label">Total Events</div>
          <div className="stat-value">{events.length.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Storage Used</div>
          <div className="stat-value">{formatBytes(storageSize)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sessions</div>
          <div className="stat-value">
            {Object.keys(analytics.getSessionInfo()).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Errors Logged</div>
          <div className="stat-value">{errors.length}</div>
        </div>
      </div>

      {/* Core Web Vitals */}
      <section className="analytics-section">
        <h2>🎯 Core Web Vitals</h2>
        <div className="vitals-grid">
          {['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].map(name => {
            const stats = getVitalStats(name);
            if (!stats) return null;

            return (
              <div key={name} className="vital-card">
                <div className="vital-header">
                  <h3>{name}</h3>
                  <span className="vital-rating">
                    {getRatingEmoji(stats.latest.rating)}
                  </span>
                </div>
                <div className="vital-value" style={{
                  color: getRatingColor(stats.latest.rating)
                }}>
                  {Math.round(stats.latest.value)}
                  <span className="vital-unit">
                    {name === 'CLS' ? '' : 'ms'}
                  </span>
                </div>
                <div className="vital-stats">
                  <div>Avg: {Math.round(stats.avg)}</div>
                  <div>Min: {Math.round(stats.min)}</div>
                  <div>Max: {Math.round(stats.max)}</div>
                  <div>Count: {stats.count}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* API Performance */}
      <section className="analytics-section">
        <h2>🌐 API Performance</h2>
        {getApiStats().length > 0 ? (
          <div className="table-container">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Calls</th>
                  <th>Avg Duration</th>
                  <th>Success Rate</th>
                </tr>
              </thead>
              <tbody>
                {getApiStats().map((stat, idx) => (
                  <tr key={idx}>
                    <td className="endpoint-cell">{stat.endpoint}</td>
                    <td>{stat.count}</td>
                    <td className={stat.avgDuration > 1000 ? 'slow' : ''}>
                      {stat.avgDuration}ms
                    </td>
                    <td>
                      <span className={`success-rate ${
                        parseFloat(stat.successRate) < 90 ? 'low' : ''
                      }`}>
                        {stat.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No API calls recorded yet. Interact with the app to see data.
          </div>
        )}
      </section>

      {/* Errors */}
      <section className="analytics-section">
        <h2>❌ Recent Errors ({errors.length})</h2>
        {errors.length > 0 ? (
          <div className="errors-list">
            {errors.reverse().map((error, idx) => (
              <div key={idx} className="error-card">
                <div className="error-header">
                  <span className="error-message">{error.message}</span>
                  <span className="error-time">
                    {formatTimestamp(error.metadata.timestamp)}
                  </span>
                </div>
                {error.stack && (
                  <details className="error-details">
                    <summary>Stack Trace</summary>
                    <pre className="error-stack">{error.stack}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            ✅ No errors logged! Your app is running smoothly.
          </div>
        )}
      </section>

      {/* Raw Events */}
      <section className="analytics-section">
        <h2>📝 All Events ({events.length})</h2>
        <div className="events-container">
          {events.length > 0 ? (
            <div className="table-container">
              <table className="analytics-table compact">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(-100).reverse().map((event, idx) => (
                    <tr key={idx}>
                      <td>{new Date(event.metadata.timestamp).toLocaleTimeString()}</td>
                      <td>
                        <span className={`event-type ${event.type}`}>
                          {event.type}
                        </span>
                      </td>
                      <td>{event.name}</td>
                      <td>{event.value !== undefined ? Math.round(event.value) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              No events recorded yet. Start using the app to collect data!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AnalyticsPage;
