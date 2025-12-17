import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'

function CacheDatabaseView({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }
  const [cacheEntries, setCacheEntries] = useState([])
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
      const res = await fetch(`http://localhost:5001/api/cache/entries?limit=${limit}`)
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
    let data = [...cacheEntries]

    // Apply filters
    Object.keys(filters).forEach(column => {
      const filterValue = filters[column]?.toLowerCase()
      if (filterValue) {
        data = data.filter(row => {
          const cellValue = String(row[column] || '')
          return cellValue.toLowerCase().includes(filterValue)
        })
      }
    })

    // Apply sorting
    data.sort((a, b) => {
      let aVal = a[sortColumn]
      let bVal = b[sortColumn]

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
        <h1 style={{ margin: 0 }}>Cache Database</h1>
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
                <th onClick={() => handleSort('operation_type')} className="sortable">
                  Operation {sortColumn === 'operation_type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('model')} className="sortable">
                  Model {sortColumn === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('prompt_hash')} className="sortable">
                  Hash {sortColumn === 'prompt_hash' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('created_at')} className="sortable">
                  Created {sortColumn === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('accessed_at')} className="sortable">
                  Last Accessed {sortColumn === 'accessed_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('access_count')} className="sortable">
                  Access Count {sortColumn === 'access_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Prompt</th>
                <th>Response</th>
              </tr>
              <tr className="filter-row">
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('id', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('operation_type', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('model', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('prompt_hash', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('created_at', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('accessed_at', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('access_count', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('prompt_preview', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('response_preview', e.target.value)} /></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData().map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.operation_type}</td>
                  <td style={{ fontSize: '0.85rem' }}>{row.model || 'unknown'}</td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {row.prompt_hash.substring(0, 12)}...
                  </td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>{new Date(row.accessed_at).toLocaleString()}</td>
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
                  <td className={expandedCells ? 'expanded-cell' : 'preview-cell'}>
                    {row.prompt_preview}
                  </td>
                  <td className={expandedCells ? 'expanded-cell' : 'preview-cell'}>
                    {row.response_preview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedData().length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              {cacheEntries.length === 0 ? 'No cache entries available' : 'No results match your filters'}
            </div>
          )}

          {cacheEntries.length > 0 && (
            <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
              Showing {filteredAndSortedData().length} of {cacheEntries.length} rows
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CacheDatabaseView
