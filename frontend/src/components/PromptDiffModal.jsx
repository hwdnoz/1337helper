function PromptDiffModal({ cachedPrompt, currentPrompt, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#1e1e1e',
        border: '1px solid #9c27b0',
        borderRadius: '4px',
        padding: '1rem',
        minWidth: '500px',
        maxWidth: '700px',
        maxHeight: '500px',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
        fontSize: '0.85rem',
        lineHeight: '1.4'
      }}
      className="prompt-diff-tooltip"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
          Prompt Comparison
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#d4d4d4',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ color: '#4caf50', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
          Cached Prompt (returned this result):
        </div>
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          padding: '0.5rem',
          borderRadius: '3px',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          color: '#d4d4d4',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {cachedPrompt}
        </div>
      </div>
      <div>
        <div style={{ color: '#2196f3', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
          Current Prompt (what you asked for):
        </div>
        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          padding: '0.5rem',
          borderRadius: '3px',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          color: '#d4d4d4',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {currentPrompt}
        </div>
      </div>
    </div>
  )
}

export default PromptDiffModal
