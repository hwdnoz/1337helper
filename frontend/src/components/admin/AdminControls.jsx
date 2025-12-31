import { useState } from 'react'

function AdminControls({
  currentModel,
  availableModels,
  cacheEnabled,
  modelAwareCache,
  semanticCacheEnabled,
  prompts,
  onModelChange,
  onToggleCache,
  onToggleModelAwareCache,
  onToggleSemanticCache,
  onPromptSelect
}) {
  const [showPromptDropdown, setShowPromptDropdown] = useState(false)

  const formatPromptName = (name) => {
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #3e3e42',
      borderRadius: '4px',
      padding: '1rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', color: '#888', minWidth: '50px' }}>Model:</label>
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value)}
          style={{
            background: '#2d2d30',
            color: '#d4d4d4',
            border: '1px solid #3e3e42',
            padding: '0.5rem 0.8rem',
            borderRadius: '4px',
            fontSize: '0.85rem',
            cursor: 'pointer',
            minWidth: '180px'
          }}
        >
          {availableModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onToggleCache}
        style={{
          background: cacheEnabled ? '#2e7d32' : '#c62828',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: '500'
        }}
      >
        Cache: {cacheEnabled ? 'ON' : 'OFF'}
      </button>

      <button
        onClick={onToggleModelAwareCache}
        style={{
          background: modelAwareCache ? '#1976d2' : '#616161',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: '500'
        }}
        title={modelAwareCache ? 'Each model has separate cache' : 'All models share the same cache'}
      >
        Model-Aware: {modelAwareCache ? 'ON' : 'OFF'}
      </button>

      <button
        onClick={onToggleSemanticCache}
        style={{
          background: semanticCacheEnabled ? '#9c27b0' : '#616161',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: '500'
        }}
        title={semanticCacheEnabled ? 'Use semantic search to find similar cached prompts' : 'Only exact matches will use cache'}
      >
        Semantic Cache: {semanticCacheEnabled ? 'ON' : 'OFF'}
      </button>

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPromptDropdown(!showPromptDropdown)}
          style={{
            background: '#6a1b9a',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '500'
          }}
        >
          Edit Prompts ▼
        </button>
        {showPromptDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '0.5rem',
            background: '#2d2d30',
            border: '1px solid #3e3e42',
            borderRadius: '4px',
            minWidth: '200px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}>
            {prompts.map(prompt => (
              <div
                key={prompt.name}
                onClick={() => {
                  onPromptSelect(prompt.name)
                  setShowPromptDropdown(false)
                }}
                style={{
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #3e3e42',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.target.style.background = '#37373d'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <span style={{ fontSize: '0.85rem' }}>{formatPromptName(prompt.name)}</span>
                {prompt.is_edited && (
                  <span style={{
                    background: '#ff9800',
                    color: '#000',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    fontWeight: '600'
                  }}>
                    EDITED
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminControls
