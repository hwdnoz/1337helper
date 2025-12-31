function PromptEditorModal({
  prompt,
  editedContent,
  saving,
  onContentChange,
  onSave,
  onReset,
  onClose
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Edit Prompt: {prompt.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px' }}>
            <small>
              Status: <strong>{prompt.is_edited ? 'Custom' : 'Default'}</strong> |
              Source: <strong>{prompt.source}</strong>
            </small>
            <br />
            <small style={{ color: '#888', marginTop: '0.5rem', display: 'block' }}>
              Use placeholders like {'{code}'}, {'{prompt}'}, {'{problem_number}'} in your template
            </small>
          </div>

          <textarea
            value={editedContent}
            onChange={(e) => onContentChange(e.target.value)}
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
            {prompt.is_edited && (
              <button onClick={onReset} style={{ background: '#ff9800' }}>
                Reset to Default
              </button>
            )}
            <button onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={onClose} style={{ background: '#555' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptEditorModal
