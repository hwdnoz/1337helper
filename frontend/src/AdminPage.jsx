import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

function AdminPage() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  useEffect(() => {
    loadMetrics()
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

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={loadMetrics}>Refresh Metrics</button>
          <button onClick={() => navigate('/')} style={{ background: '#555' }}>
            Back to Code Runner
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
                  <div className="stat-value">{summary.avg_latency_ms}ms</div>
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

          {/* Recent Calls */}
          <div className="admin-section">
            <h2>Recent LLM Calls ({metrics.length})</h2>
            <div className="metrics-list">
              {metrics.map((metric, idx) => (
                <div key={idx} className="metric-card">
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
                        {metric.tokens_sent} → {metric.tokens_received} ({metric.total_tokens} total)
                      </span>
                    </div>
                    <div className="metric-detail">
                      <span className="detail-label">Latency:</span>
                      <span className="detail-value">{Math.round(metric.latency_ms)}ms</span>
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
    </div>
  )
}

export default AdminPage
