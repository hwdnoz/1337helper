import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DatabaseTable from './components/DatabaseTable'
import './App.css'
import { API_URL } from './config'

function RagDatabaseView({ onLogout }) {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newDocContent, setNewDocContent] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/rag/documents?limit=500`)
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

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'content',
      label: 'Content',
      longText: true
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => <td>{new Date(row.created_at).toLocaleString()}</td>
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      filterable: false,
      render: (row) => (
        <td>
          <button
            onClick={() => handleDeleteDocument(row.id)}
            style={{ background: '#d32f2f', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
          >
            Delete
          </button>
        </td>
      )
    }
  ]

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>RAG Database</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate('/admin')} style={{ background: '#555' }}>
            Back to Admin
          </button>
          <button onClick={() => { onLogout(); navigate('/login') }} style={{ background: '#d32f2f' }}>
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

      <DatabaseTable
        data={documents}
        columns={columns}
        loading={loading}
        onRefresh={loadData}
        emptyMessage="No RAG documents available"
      />
    </div>
  )
}

export default RagDatabaseView
