function RecentCallsList({ metrics, onCallClick }) {
  return (
    <div className="admin-section">
      <h2>Recent LLM Calls ({metrics.length})</h2>
      <div className="metrics-list">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="metric-card clickable"
            onClick={() => onCallClick(metric.id)}
          >
            <div className="metric-header">
              <span className={`metric-status ${metric.success ? 'success' : 'error'}`}>
                {metric.success ? '✓' : '✗'}
              </span>
              <span className="metric-operation">{metric.operation_type}</span>
              <span className="metric-time">{new Date(metric.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="metric-details">
              <div className="metric-detail">
                <span className="detail-label">Tokens:</span>
                <span className="detail-value">
                  {metric.tokens_sent} sent → {metric.tokens_received} received ({metric.total_tokens} total)
                </span>
              </div>
              <div className="metric-detail">
                <span className="detail-label">Latency:</span>
                <span className="detail-value">{(metric.latency_ms / 1000).toFixed(2)}s</span>
              </div>
              {metric.error && (
                <div className="metric-detail error">
                  <span className="detail-label">Error:</span>
                  <span className="detail-value">{metric.error}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentCallsList
