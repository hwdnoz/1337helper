import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatabaseTable from './components/DatabaseTable'
import './App.css'
import { API_URL } from './config'

function CacheDatabaseView({ onLogout }) {
  const navigate = useNavigate()
  const [cacheEntries, setCacheEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)

  useEffect(() => {
    loadData()
  }, [limit])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/cache/entries?limit=${limit}`)
      const data = await res.json()
      if (data.success) {
        setCacheEntries(data.entries)
      }
    } catch (error) {
      console.error('Failed to load cache data:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'operation_type', label: 'Operation' },
    {
      key: 'model',
      label: 'Model',
      render: (row) => <td style={{ fontSize: '0.85rem' }}>{row.model || 'unknown'}</td>
    },
    {
      key: 'prompt_hash',
      label: 'Hash',
      render: (row) => (
        <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
          {row.prompt_hash.substring(0, 12)}...
        </td>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => <td>{new Date(row.created_at).toLocaleString()}</td>
    },
    {
      key: 'accessed_at',
      label: 'Last Accessed',
      render: (row) => <td>{new Date(row.accessed_at).toLocaleString()}</td>
    },
    {
      key: 'access_count',
      label: 'Access Count',
      render: (row) => (
        <td>
          <span style={{
            background: row.access_count > 1 ? '#1b5e20' : '#424242',
            padding: '0.25rem 0.5rem',
            borderRadius: '3px',
            fontSize: '0.85rem'
          }}>
            {row.access_count}
          </span>
        </td>
      )
    },
    {
      key: 'prompt_preview',
      label: 'Prompt',
      longText: true
    },
    {
      key: 'response_preview',
      label: 'Response',
      longText: true
    }
  ]

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Cache Database</h1>
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
          <button onClick={() => navigate('/admin/metrics-database')} style={{ background: '#ff9800' }}>
            Metrics Database
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
        data={cacheEntries}
        columns={columns}
        loading={loading}
        onRefresh={loadData}
        emptyMessage="No cache entries available"
      />
    </div>
  )
}

export default CacheDatabaseView
