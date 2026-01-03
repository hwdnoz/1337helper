import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'
import { API_URL } from './config'

function RagDatabaseView({ onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(100)
  const [sortColumn, setSortColumn] = useState('id')
  const [sortDirection, setSortDirection] = useState('desc')
  const [filters, setFilters] = useState({})
  const [expandedCells, setExpandedCells] = useState(false)
  const [newDocContent, setNewDocContent] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [limit])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/rag/documents?limit=${limit}`)
      const data = await res.json()

      if (data.success) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Failed to load RAG documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDocument = async () => {
    if (!newDocContent.trim()) return

    setAdding(true)
    try {
      const res = await fetch(`${API_URL}/api/rag/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newDocContent })
      })
      const data = await res.json()

      if (data.success) {
        setNewDocContent('')
        await loadData()
      } else {
        alert('Failed to add document: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to add document:', error)
      alert('Failed to add document')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm(`Delete document ${docId}?`)) return

    try {
      const res = await fetch(`${API_URL}/api/rag/documents/${docId}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (data.success) {
        await loadData()
      } else {
        alert('Failed to delete document: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert('Failed to delete document')
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
    let data = [...documents]

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
        <h1 style={{ margin: 0 }}>RAG Database</h1>
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

      {/* Add Document Section */}
      <div style={{
        marginBottom: '1rem',
        padding: '1rem',
        background: '#2d2d2d',
        borderRadius: '4px',
        border: '1px solid #3e3e42'
      }}>
        <h3 style={{ marginTop: 0 }}>Add New Document</h3>
        <textarea
          value={newDocContent}
          onChange={(e) => setNewDocContent(e.target.value)}
          placeholder="Enter document content..."
          style={{
            width: '100%',
            minHeight: '100px',
            background: '#1e1e1e',
            color: '#d4d4d4',
            border: '1px solid #3e3e42',
            padding: '0.5rem',
            borderRadius: '2px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            resize: 'vertical'
          }}
        />
        <button
          onClick={handleAddDocument}
          disabled={adding || !newDocContent.trim()}
          style={{ marginTop: '0.5rem', background: '#4caf50' }}
        >
          {adding ? 'Adding...' : 'Add Document'}
        </button>
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
                <th>Content</th>
                <th onClick={() => handleSort('created_at')} className="sortable">
                  Created {sortColumn === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
              <tr className="filter-row">
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('id', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('content', e.target.value)} /></th>
                <th><input type="text" placeholder="Filter..." onChange={(e) => handleFilterChange('created_at', e.target.value)} /></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData().map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td className={expandedCells ? 'expanded-cell' : 'preview-cell'}>
                    {row.content}
                  </td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteDocument(row.id)}
                      style={{
                        background: '#d32f2f',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.85rem'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedData().length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              {documents.length === 0 ? 'No RAG documents available' : 'No results match your filters'}
            </div>
          )}

          {documents.length > 0 && (
            <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.9rem' }}>
              Showing {filteredAndSortedData().length} of {documents.length} documents
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RagDatabaseView
