import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatabaseTable from './components/DatabaseTable'
import './App.css'
import { API_URL } from './config'

function MetricsDatabaseView({ onLogout }) {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)

  useEffect(() => {
    loadData()
  }, [limit])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/observability/metrics?limit=${limit}`)
      const data = await res.json()
      if (data.success) {
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (row) => <td>{new Date(row.timestamp).toLocaleString()}</td>
    },
    { key: 'operation_type', label: 'Operation' },
    {
      key: 'model',
      label: 'Model',
      getValue: (row) => row.metadata?.model || 'N/A'
    },
    { key: 'tokens_sent', label: 'Tokens Sent' },
    { key: 'tokens_received', label: 'Tokens Received' },
    { key: 'total_tokens', label: 'Total Tokens' },
    {
      key: 'latency',
      label: 'Latency (s)',
      getValue: (row) => (row.latency_ms / 1000).toFixed(2)
    },
    {
      key: 'success',
      label: 'Success',
      render: (row) => (
        <td>
          <span className={`status-badge ${row.success ? 'success' : 'error'}`}>
            {row.success ? '✓' : '✗'}
          </span>
        </td>
      )
    },
    {
      key: 'prompt',
      label: 'Prompt',
      longText: true,
      getValue: (row) => row.prompt_preview
    },
    {
      key: 'response',
      label: 'Response',
      longText: true,
      getValue: (row) => row.response_preview
    }
  ]

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Metrics Database</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem' }}>
            Show:
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                marginLeft: '0.5rem',
                background: '#2d2d2d',
                color: '#d4d4d4',
                border: '1px solid #3e3e42',
                padding: '0.5rem',
                borderRadius: '2px'
              }}
            >
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={250}>250 rows</option>
              <option value={500}>500 rows</option>
            </select>
          </label>
          <button onClick={() => navigate('/admin/cache-database')} style={{ background: '#1976d2' }}>
            Cache Database
          </button>
          <button onClick={() => navigate('/admin')} style={{ background: '#555' }}>
            Back to Admin
          </button>
          <button onClick={() => { onLogout(); navigate('/login') }} style={{ background: '#d32f2f' }}>
            Logout
          </button>
        </div>
      </div>

      <DatabaseTable
        data={metrics}
        columns={columns}
        loading={loading}
        onRefresh={loadData}
        emptyMessage="No data available"
      />
    </div>
  )
}

export default MetricsDatabaseView
