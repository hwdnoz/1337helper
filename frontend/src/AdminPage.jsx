import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminControls from './components/AdminControls'
import SummaryStats from './components/SummaryStats'
import PerformanceChart from './components/PerformanceChart'
import CacheChart from './components/CacheChart'
import './App.css'
import { API_URL } from './config'

const AVAILABLE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

function AdminPage({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  // Core data
  const [metrics, setMetrics] = useState([])
  const [summary, setSummary] = useState(null)
  const [cacheStats, setCacheStats] = useState(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  // Settings state
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [modelAwareCache, setModelAwareCache] = useState(true)
  const [currentModel, setCurrentModel] = useState('gemini-2.5-flash')

  // UI state
  const [selectedCall, setSelectedCall] = useState(null)
  const [loadingCall, setLoadingCall] = useState(false)
  const [showDbDropdown, setShowDbDropdown] = useState(false)

  // Prompt management state
  const [prompts, setPrompts] = useState([])
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [editedPromptContent, setEditedPromptContent] = useState('')
  const [savingPrompt, setSavingPrompt] = useState(false)

  useEffect(() => {
    loadMetrics()
    loadCacheStats()
    loadCacheEnabled()
    loadModelAwareCache()
    loadCurrentModel()
    loadPrompts()
  }, [])

  const loadMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const [metricsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/observability/metrics?limit=50`),
        fetch(`${API_URL}/api/observability/summary`)
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
      const res = await fetch(`${API_URL}/api/observability/call/${callId}`)
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
      const res = await fetch(`${API_URL}/api/cache/stats`)
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
      const res = await fetch(`${API_URL}/api/cache/clear`, { method: 'POST' })
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
      const res = await fetch(`${API_URL}/api/cache/clear-expired`, { method: 'POST' })
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

  const loadCacheEnabled = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/enabled`)
      const data = await res.json()

      if (data.success) {
        setCacheEnabled(data.enabled)
      }
    } catch (error) {
      console.error('Failed to load cache enabled status:', error)
    }
  }

  const toggleCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/enabled`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !cacheEnabled })
      })
      const data = await res.json()

      if (data.success) {
        setCacheEnabled(data.enabled)
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to toggle cache:', error)
      alert('Failed to toggle cache')
    }
  }

  const loadModelAwareCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/model-aware`)
      const data = await res.json()

      if (data.success) {
        setModelAwareCache(data.model_aware)
      }
    } catch (error) {
      console.error('Failed to load model-aware cache status:', error)
    }
  }

  const toggleModelAwareCache = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cache/model-aware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_aware: !modelAwareCache })
      })
      const data = await res.json()

      if (data.success) {
        setModelAwareCache(data.model_aware)
        loadCacheStats()
      }
    } catch (error) {
      console.error('Failed to toggle model-aware cache:', error)
      alert('Failed to toggle model-aware cache')
    }
  }

  const loadCurrentModel = async () => {
    try {
      const res = await fetch(`${API_URL}/api/current-model`)
      const data = await res.json()

      if (data.success) {
        setCurrentModel(data.model)
      }
    } catch (error) {
      console.error('Failed to load current model:', error)
    }
  }

  const changeModel = async (model) => {
    try {
      const res = await fetch(`${API_URL}/api/current-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      })
      const data = await res.json()

      if (data.success) {
        setCurrentModel(data.model)
        alert(`Model changed to ${data.model}`)
      }
    } catch (error) {
      console.error('Failed to change model:', error)
      alert('Failed to change model')
    }
  }

  const loadPrompts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/prompts`)
      const data = await res.json()
      if (data.success) {
        setPrompts(data.prompts)
      }
    } catch (error) {
      console.error('Failed to load prompts:', error)
    }
  }

  const openPromptEditor = async (promptName) => {
    try {
      const res = await fetch(`${API_URL}/api/prompts/${promptName}`)
      const data = await res.json()
      if (data.success) {
        setSelectedPrompt({ name: promptName, ...data.prompt })
        setEditedPromptContent(data.prompt.content)
      }
    } catch (error) {
      console.error('Failed to load prompt:', error)
    }
  }

  const savePrompt = async () => {
    if (!selectedPrompt) return
    setSavingPrompt(true)
    try {
      const res = await fetch(`${API_URL}/api/prompts/${selectedPrompt.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedPromptContent })
      })
      const data = await res.json()
      if (data.success) {
        alert('Prompt saved!')
        setSelectedPrompt({ ...selectedPrompt, ...data.prompt })
        loadPrompts()
      } else {
        alert('Failed to save: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to save prompt:', error)
      alert('Failed to save prompt')
    } finally {
      setSavingPrompt(false)
    }
  }

  const resetPrompt = async () => {
    if (!selectedPrompt || !confirm('Reset to default?')) return
    try {
      const res = await fetch(`${API_URL}/api/prompts/${selectedPrompt.name}/reset`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        alert('Reset to default!')
        setSelectedPrompt({ name: selectedPrompt.name, ...data.prompt })
        setEditedPromptContent(data.prompt.content)
        loadPrompts()
      }
    } catch (error) {
      console.error('Failed to reset prompt:', error)
    }
  }

  const closePromptEditor = () => {
    setSelectedPrompt(null)
    setEditedPromptContent('')
  }

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowDbDropdown(!showDbDropdown)}>
              View Database ▼
            </button>
            {showDbDropdown && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    navigate('/admin/metrics-database')
                    setShowDbDropdown(false)
                  }}
                >
                  Metrics Database
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => {
                    navigate('/admin/cache-database')
                    setShowDbDropdown(false)
                  }}
                >
                  Cache Database
                </div>
              </div>
            )}
          </div>
          <button onClick={loadMetrics}>Refresh</button>
          <button onClick={() => navigate('/')} style={{ background: '#555' }}>
            Back to Code Runner
          </button>
          <button onClick={handleLogout} style={{ background: '#d32f2f' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Admin Controls Section */}
      <AdminControls
        currentModel={currentModel}
        availableModels={AVAILABLE_MODELS}
        cacheEnabled={cacheEnabled}
        modelAwareCache={modelAwareCache}
        prompts={prompts}
        onModelChange={changeModel}
        onToggleCache={toggleCache}
        onToggleModelAwareCache={toggleModelAwareCache}
        onPromptSelect={openPromptEditor}
      />

      {loadingMetrics ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="admin-container">
          {/* Summary Stats, Cache Stats, and Operation Breakdown */}
          <SummaryStats
            summary={summary}
            cacheStats={cacheStats}
            cacheEnabled={cacheEnabled}
            onToggleCache={toggleCache}
            onClearExpiredCache={clearExpiredCache}
            onClearCache={clearCache}
          />

          {/* Performance Chart */}
          <PerformanceChart metrics={metrics} />

          {/* Cache Hit/Miss Chart */}
          <CacheChart metrics={metrics} />

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

      {/* Modal for prompt editor */}
      {selectedPrompt && (
        <div className="modal-overlay" onClick={closePromptEditor}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Edit Prompt: {selectedPrompt.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h2>
              <button className="modal-close" onClick={closePromptEditor}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px' }}>
                <small>
                  Status: <strong>{selectedPrompt.is_edited ? 'Custom' : 'Default'}</strong> |
                  Source: <strong>{selectedPrompt.source}</strong>
                </small>
                <br />
                <small style={{ color: '#888', marginTop: '0.5rem', display: 'block' }}>
                  Use placeholders like {'{code}'}, {'{prompt}'}, {'{problem_number}'} in your template
                </small>
              </div>

              <textarea
                value={editedPromptContent}
                onChange={(e) => setEditedPromptContent(e.target.value)}
                rows={20}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#1a1a1a',
                  border: '2px solid #444',
                  borderRadius: '8px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  resize: 'vertical'
                }}
                spellCheck={false}
              />

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                {selectedPrompt.is_edited && (
                  <button onClick={resetPrompt} style={{ background: '#ff9800' }}>
                    Reset to Default
                  </button>
                )}
                <button onClick={savePrompt} disabled={savingPrompt}>
                  {savingPrompt ? 'Saving...' : 'Save'}
                </button>
                <button onClick={closePromptEditor} style={{ background: '#555' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPage
