import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

function DatabaseView({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)
  const [sortColumn, setSortColumn] = useState('id')
  const [sortDirection, setSortDirection] = useState('desc')
  const [filters, setFilters] = useState({})
  const [expandedCells, setExpandedCells] = useState(false)

  useEffect(() => {
    loadData()
  }, [limit])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`http://localhost:5001/api/observability/metrics?limit=${limit}`)
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

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleFilterChange = (column, value) => {
    setFilters({ ...filters, [column]: value })
  }

  const filteredAndSortedData = () => {
    let data = [...metrics]

    // Apply filters
    Object.keys(filters).forEach(column => {
      const filterValue = filters[column]?.toLowerCase()
      if (filterValue) {
        data = data.filter(row => {
          let cellValue = ''
          if (column === 'model') {
            cellValue = row.metadata?.model || ''
          } else if (column === 'latency') {
            cellValue = (row.latency_ms / 1000).toFixed(2)
          } else {
            cellValue = String(row[column] || '')
          }
          return cellValue.toLowerCase().includes(filterValue)
        })
      }
    })

    // Apply sorting
    data.sort((a, b) => {
      let aVal, bVal

      if (sortColumn === 'model') {
        aVal = a.metadata?.model || ''
        bVal = b.metadata?.model || ''
      } else if (sortColumn === 'latency') {
        aVal = a.latency_ms
        bVal = b.latency_ms
      } else {
        aVal = a[sortColumn]
        bVal = b[sortColumn]
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return data
  }

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Database</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setExpandedCells(!expandedCells)}
            style={{ background: expandedCells ? '#0e639c' : '#555' }}
          >
            {expandedCells ? 'Collapse Cells' : 'Expand Cells'}
          </button>
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
          <button onClick={loadData}>Refresh</button>
          <button onClick={() => navigate('/admin')} style={{ background: '#555' }}>
            Back to Admin
          </button>
          <button onClick={handleLogout} style={{ background: '#d32f2f' }}>
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} className="sortable">
                  ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('timestamp')} className="sortable">
                  Timestamp {sortColumn === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('operation_type')} className="sortable">
                  Operation {sortColumn === 'operation_type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('model')} className="sortable">
                  Model {sortColumn === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('tokens_sent')} className="sortable">
                  Tokens Sent {sortColumn === 'tokens_sent' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('tokens_received')} className="sortable">
                  Tokens Received {sortColumn === 'tokens_received' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('total_tokens')} className="sortable">
                  Total Tokens {sortColumn === 'total_tokens' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('latency')} className="sortable">
                  Latency (s) {sortColumn === 'latency' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('success')} className="sortable">
                  Success {sortColumn === 'success' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Prompt</th>
                <th>Response</th>
              </tr>
              <tr className="filter-row">
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('id', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('timestamp', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('operation_type', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('model', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('tokens_sent', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('tokens_received', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('total_tokens', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('latency', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('success', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('prompt_preview', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('response_preview', e.target.value)} /></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData().map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td>{row.operation_type}</td>
                  <td>{row.metadata?.model || 'N/A'}</td>
                  <td>{row.tokens_sent}</td>
                  <td>{row.tokens_received}</td>
                  <td>{row.total_tokens}</td>
                  <td>{(row.latency_ms / 1000).toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${row.success ? 'success' : 'error'}`}>
                      {row.success ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className={expandedCells ? 'expanded-cell' : 'preview-cell'}>
                    {expandedCells ? row.prompt : row.prompt_preview}
                  </td>
                  <td className={expandedCells ? 'expanded-cell' : 'preview-cell'}>
                    {expandedCells ? row.response_text : row.response_preview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedData().length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              {metrics.length === 0 ? 'No data available' : 'No results match your filters'}
            </div>
          )}

          {metrics.length > 0 && (
            <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
              Showing {filteredAndSortedData().length} of {metrics.length} rows
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DatabaseView
