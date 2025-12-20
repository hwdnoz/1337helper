import { useState, useEffect } from 'react'
import { API_URL } from '../config'

function PromptManager() {
  const [prompts, setPrompts] = useState([])
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [editedContent, setEditedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/prompts`)
      const data = await res.json()

      if (data.success) {
        setPrompts(data.prompts)
      }
    } catch (error) {
      console.error('Failed to load prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPromptContent = async (promptName) => {
    try {
      const res = await fetch(`${API_URL}/api/prompts/${promptName}`)
      const data = await res.json()

      if (data.success) {
        setSelectedPrompt({ name: promptName, ...data.prompt })
        setEditedContent(data.prompt.content)
      }
    } catch (error) {
      console.error('Failed to load prompt content:', error)
    }
  }

  const savePrompt = async () => {
    if (!selectedPrompt) return

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/prompts/${selectedPrompt.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent })
      })
      const data = await res.json()

      if (data.success) {
        alert('Prompt saved successfully!')
        setSelectedPrompt({ ...selectedPrompt, ...data.prompt })
        loadPrompts()
      } else {
        alert('Failed to save prompt: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to save prompt:', error)
      alert('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const resetPrompt = async () => {
    if (!selectedPrompt) return
    if (!confirm('Reset this prompt to default? This will discard your edits.')) return

    try {
      const res = await fetch(`${API_URL}/api/prompts/${selectedPrompt.name}/reset`, {
        method: 'POST'
      })
      const data = await res.json()

      if (data.success) {
        alert('Prompt reset to default!')
        setSelectedPrompt({ name: selectedPrompt.name, ...data.prompt })
        setEditedContent(data.prompt.content)
        loadPrompts()
      } else {
        alert('Failed to reset prompt: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to reset prompt:', error)
      alert('Failed to reset prompt')
    }
  }

  const closeEditor = () => {
    setSelectedPrompt(null)
    setEditedContent('')
  }

  const formatPromptName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="admin-section">
      <h2>Prompt Management</h2>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="prompts-container">
          <div className="prompts-list">
            {prompts.map((prompt) => (
              <div
                key={prompt.name}
                className={`prompt-item ${selectedPrompt?.name === prompt.name ? 'active' : ''}`}
                onClick={() => loadPromptContent(prompt.name)}
              >
                <div className="prompt-name">{formatPromptName(prompt.name)}</div>
                <div className="prompt-status">
                  {prompt.is_edited ? (
                    <span className="badge edited">Edited</span>
                  ) : (
                    <span className="badge default">Default</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedPrompt && (
            <div className="prompt-editor">
              <div className="editor-header">
                <h3>{formatPromptName(selectedPrompt.name)}</h3>
                <div className="editor-actions">
                  {selectedPrompt.is_edited && (
                    <button onClick={resetPrompt} className="button-secondary">
                      Reset to Default
                    </button>
                  )}
                  <button onClick={savePrompt} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={closeEditor} className="button-secondary">Close</button>
                </div>
              </div>

              <div className="editor-info">
                <small>
                  Status: <strong>{selectedPrompt.is_edited ? 'Custom' : 'Default'}</strong> |
                  Source: <strong>{selectedPrompt.source}</strong>
                </small>
                <br />
                <small style={{ color: '#888', marginTop: '0.5rem', display: 'block' }}>
                  Use placeholders like {'{code}'}, {'{prompt}'}, {'{problem_number}'} in your prompt template
                </small>
              </div>

              <textarea
                className="prompt-textarea"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={20}
                spellCheck={false}
              />
            </div>
          )}
        </div>
      )}

      <style>{`
        .prompts-container {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .prompts-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .prompt-item {
          padding: 1rem;
          background: #2a2a2a;
          border: 2px solid #444;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .prompt-item:hover {
          background: #333;
          border-color: #007bff;
        }

        .prompt-item.active {
          background: #1a3a5a;
          border-color: #007bff;
        }

        .prompt-name {
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .badge.edited {
          background: #ff9800;
          color: #000;
        }

        .badge.default {
          background: #4caf50;
          color: #000;
        }

        .prompt-editor {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .editor-header h3 {
          margin: 0;
        }

        .editor-actions {
          display: flex;
          gap: 0.5rem;
        }

        .editor-info {
          padding: 0.75rem;
          background: #1a1a1a;
          border-radius: 4px;
          border: 1px solid #444;
        }

        .prompt-textarea {
          width: 100%;
          padding: 1rem;
          background: #1a1a1a;
          border: 2px solid #444;
          border-radius: 8px;
          color: #fff;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.5;
          resize: vertical;
        }

        .prompt-textarea:focus {
          outline: none;
          border-color: #007bff;
        }

        .button-secondary {
          background: #555;
        }

        .button-secondary:hover {
          background: #666;
        }

        @media (max-width: 968px) {
          .prompts-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default PromptManager
