import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './App.css'

function AdminPage({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }
  const [metrics, setMetrics] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [selectedCall, setSelectedCall] = useState(null)
  const [loadingCall, setLoadingCall] = useState(false)
  const [cacheStats, setCacheStats] = useState(null)

  useEffect(() => {
    loadMetrics()
    loadCacheStats()
  }, [])

  const loadMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const [metricsRes, summaryRes] = await Promise.all([
        fetch('http://localhost:5001/api/observability/metrics?limit=50'),
        fetch('http://localhost:5001/api/observability/summary')
      ])

      const metricsData = await metricsRes.json()
      const summaryData = await summaryRes.json()

      if (metricsData.success) {
        setMetrics(metricsData.metrics)
      }
      if (summaryData.success) {
        setSummary(summaryData.summary)
      }
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const loadCallDetails = async (callId) => {
    setLoadingCall(true)
    try {
      const res = await fetch(`http://localhost:5001/api/observability/call/${callId}`)
      const data = await res.json()

      if (data.success) {
        setSelectedCall(data.call)
      }
    } catch (error) {
      console.error('Failed to load call details:', error)
    } finally {
      setLoadingCall(false)
    }
  }

  const closeModal = () => {
    setSelectedCall(null)
  }

  const loadCacheStats = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/cache/stats')
      const data = await res.json()

      if (data.success) {
        setCacheStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    }
  }

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear all cache entries?')) {
      return
    }

    try {
      const res = await fetch('http://localhost:5001/api/cache/clear', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert(`Cleared ${data.deleted_count} cache entries`)
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to clear cache:', error)
      alert('Failed to clear cache')
    }
  }

  const clearExpiredCache = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/cache/clear-expired', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert(`Cleared ${data.deleted_count} expired cache entries`)
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to clear expired cache:', error)
      alert('Failed to clear expired cache')
    }
  }

  const prepareChartData = () => {
    return metrics
      .slice()
      .reverse()
      .map((metric, index) => ({
        name: new Date(metric.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency: (metric.latency_ms / 1000).toFixed(2),
        tokensSent: metric.tokens_sent,
        tokensReceived: metric.tokens_received,
        totalTokens: metric.total_tokens,
        cacheHit: metric.metadata?.cache_hit ? 1 : 0
      }))
  }

  const prepareCacheChartData = () => {
    return metrics
      .slice()
      .reverse()
      .map((metric) => ({
        name: new Date(metric.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cacheHits: metric.metadata?.cache_hit ? 1 : 0,
        cacheMisses: metric.metadata?.cache_hit === false ? 1 : 0
      }))
  }

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/admin/database')}>
            View Database
          </button>
          <button onClick={loadMetrics}>Refresh Metrics</button>
          <button onClick={() => navigate('/')} style={{ background: '#555' }}>
            Back to Code Runner
          </button>
          <button onClick={handleLogout} style={{ background: '#d32f2f' }}>
            Logout
          </button>
        </div>
      </div>

      {loadingMetrics ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="admin-container">
          {/* Summary Stats */}
          {summary && (
            <div className="admin-section">
              <h2>Summary Statistics</h2>
              <div className="admin-stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Calls</div>
                  <div className="stat-value">{summary.total_calls}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Success Rate</div>
                  <div className="stat-value">
                    {summary.total_calls > 0
                      ? Math.round((summary.successful_calls / summary.total_calls) * 100)
                      : 0}%
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Tokens</div>
                  <div className="stat-value">{summary.total_tokens.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Latency</div>
                  <div className="stat-value">{(summary.avg_latency_ms / 1000).toFixed(2)}s</div>
                </div>
              </div>
            </div>
          )}

          {/* Cache Statistics */}
          {cacheStats && (
            <div className="admin-section">
              <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Cache Statistics</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={clearExpiredCache}
                    style={{ background: '#f57c00', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                  >
                    Clear Expired
                  </button>
                  <button
                    onClick={clearCache}
                    style={{ background: '#d32f2f', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                  >
                    Clear All Cache
                  </button>
                </div>
              </h2>
              <div className="admin-stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Cached Entries</div>
                  <div className="stat-value">{cacheStats.total_entries}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Accesses</div>
                  <div className="stat-value">{cacheStats.total_accesses}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Avg Accesses/Entry</div>
                  <div className="stat-value">{cacheStats.avg_accesses_per_entry}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">TTL (Hours)</div>
                  <div className="stat-value">{cacheStats.ttl_hours}h</div>
                </div>
              </div>
            </div>
          )}

          {/* Operation Breakdown */}
          {summary && summary.operation_breakdown && (
            <div className="admin-section">
              <h2>Operation Breakdown</h2>
              <div className="operation-breakdown">
                {Object.entries(summary.operation_breakdown).map(([op, count]) => (
                  <div key={op} className="operation-row">
                    <span className="operation-name">{op.replace(/_/g, ' ')}</span>
                    <span className="operation-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Chart */}
          {metrics.length > 0 && (
            <div className="admin-section">
              <h2>Performance Over Time</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={prepareChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    style={{ fontSize: '0.8rem' }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#888"
                    style={{ fontSize: '0.8rem' }}
                    label={{ value: 'Latency (s)', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#888"
                    style={{ fontSize: '0.8rem' }}
                    label={{ value: 'Tokens', angle: 90, position: 'insideRight', style: { fill: '#888' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#252526',
                      border: '1px solid #3e3e42',
                      borderRadius: '4px',
                      color: '#d4d4d4'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#d4d4d4' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="latency"
                    stroke="#f44336"
                    name="Latency (s)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokensSent"
                    stroke="#4caf50"
                    name="Tokens Sent"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokensReceived"
                    stroke="#2196f3"
                    name="Tokens Received"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cache Hit/Miss Chart */}
          {metrics.length > 0 && (
            <div className="admin-section">
              <h2>Cache Performance Over Time</h2>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={prepareCacheChartData()} margin={{ top: 5, right: 90, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    style={{ fontSize: '0.8rem' }}
                  />
                  <YAxis
                    stroke="#888"
                    style={{ fontSize: '0.8rem' }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#252526',
                      border: '1px solid #3e3e42',
                      borderRadius: '4px',
                      color: '#d4d4d4'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#d4d4d4' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cacheHits"
                    stroke="#4caf50"
                    name="Cache Hits"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cacheMisses"
                    stroke="#ff9800"
                    name="Cache Misses"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Calls */}
          <div className="admin-section">
            <h2>Recent LLM Calls ({metrics.length})</h2>
            <div className="metrics-list">
              {metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="metric-card clickable"
                  onClick={() => loadCallDetails(metric.id)}
                >
                  <div className="metric-header">
                    <span className={`metric-status ${metric.success ? 'success' : 'error'}`}>
                      {metric.success ? '✓' : '✗'}
                    </span>
                    <span className="metric-operation">{metric.operation_type}</span>
                    <span className="metric-time">{new Date(metric.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="metric-details">
                    <div className="metric-detail">
                      <span className="detail-label">Tokens:</span>
                      <span className="detail-value">
                        {metric.tokens_sent} sent → {metric.tokens_received} received ({metric.total_tokens} total)
                      </span>
                    </div>
                    <div className="metric-detail">
                      <span className="detail-label">Latency:</span>
                      <span className="detail-value">{(metric.latency_ms / 1000).toFixed(2)}s</span>
                    </div>
                    {metric.error && (
                      <div className="metric-detail error">
                        <span className="detail-label">Error:</span>
                        <span className="detail-value">{metric.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal for call details */}
      {selectedCall && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>LLM Call Details</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            {loadingCall ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="modal-body">
                <div className="modal-section">
                  <h3>Metadata</h3>
                  <div className="metadata-grid">
                    <div><strong>Operation:</strong> {selectedCall.operation_type}</div>
                    <div><strong>Model:</strong> {selectedCall.metadata?.model || 'N/A'}</div>
                    <div><strong>Timestamp:</strong> {new Date(selectedCall.timestamp).toLocaleString()}</div>
                    <div><strong>Status:</strong> {selectedCall.success ? '✓ Success' : '✗ Failed'}</div>
                    <div><strong>Latency:</strong> {(selectedCall.latency_ms / 1000).toFixed(2)}s</div>
                    <div><strong>Tokens Sent:</strong> {selectedCall.tokens_sent}</div>
                    <div><strong>Tokens Received:</strong> {selectedCall.tokens_received}</div>
                  </div>
                </div>

                <div className="modal-section">
                  <h3>Prompt</h3>
                  <pre className="code-block">{selectedCall.prompt}</pre>
                </div>

                <div className="modal-section">
                  <h3>Response</h3>
                  <pre className="code-block">{selectedCall.response_text}</pre>
                </div>

                {selectedCall.error && (
                  <div className="modal-section error">
                    <h3>Error</h3>
                    <pre className="code-block">{selectedCall.error}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
