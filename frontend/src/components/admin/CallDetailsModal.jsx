function CallDetailsModal({ call, loading, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>LLM Call Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="modal-section">
              <h3>Metadata</h3>
              <div className="metadata-grid">
                <div><strong>Operation:</strong> {call.operation_type}</div>
                <div><strong>Model:</strong> {call.metadata?.model || 'N/A'}</div>
                <div><strong>Timestamp:</strong> {new Date(call.timestamp).toLocaleString()}</div>
                <div><strong>Status:</strong> {call.success ? '✓ Success' : '✗ Failed'}</div>
                <div><strong>Latency:</strong> {(call.latency_ms / 1000).toFixed(2)}s</div>
                <div><strong>Tokens Sent:</strong> {call.tokens_sent}</div>
                <div><strong>Tokens Received:</strong> {call.tokens_received}</div>
              </div>
            </div>

            <div className="modal-section">
              <h3>Prompt</h3>
              <pre className="code-block">{call.prompt}</pre>
            </div>

            <div className="modal-section">
              <h3>Response</h3>
              <pre className="code-block">{call.response_text}</pre>
            </div>

            {call.error && (
              <div className="modal-section error">
                <h3>Error</h3>
                <pre className="code-block">{call.error}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CallDetailsModal
