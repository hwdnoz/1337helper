function SummaryStats({
  summary,
  cacheStats,
  cacheEnabled,
  onToggleCache,
  onClearExpiredCache,
  onClearCache
}) {
  return (
    <>
      {/* Summary Statistics */}
      {summary && (
        <div className="admin-section">
          <h2>Summary Statistics</h2>
          <div className="admin-stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Calls</div>
              <div className="stat-value">{summary.total_calls}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Success Rate</div>
              <div className="stat-value">
                {summary.total_calls > 0
                  ? Math.round((summary.successful_calls / summary.total_calls) * 100)
                  : 0}%
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Tokens</div>
              <div className="stat-value">{summary.total_tokens.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Latency</div>
              <div className="stat-value">{(summary.avg_latency_ms / 1000).toFixed(2)}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="admin-section">
          <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Cache Statistics</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={onToggleCache}
                style={{
                  background: cacheEnabled ? '#4caf50' : '#757575',
                  fontSize: '0.85rem',
                  padding: '0.4rem 0.8rem',
                  fontWeight: 'bold'
                }}
              >
                {cacheEnabled ? '✓ Cache Enabled' : 'Cache Disabled'}
              </button>
              <button
                onClick={onClearExpiredCache}
                style={{ background: '#f57c00', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                Clear Expired
              </button>
              <button
                onClick={onClearCache}
                style={{ background: '#d32f2f', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                Clear All Cache
              </button>
            </div>
          </h2>
          <div className="admin-stats-grid">
            <div className="stat-card">
              <div className="stat-label">Cached Entries</div>
              <div className="stat-value">{cacheStats.total_entries}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Accesses</div>
              <div className="stat-value">{cacheStats.total_accesses}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Accesses/Entry</div>
              <div className="stat-value">{cacheStats.avg_accesses_per_entry}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">TTL (Hours)</div>
              <div className="stat-value">{cacheStats.ttl_hours}h</div>
            </div>
          </div>
        </div>
      )}

      {/* Operation Breakdown */}
      {summary && summary.operation_breakdown && (
        <div className="admin-section">
          <h2>Operation Breakdown</h2>
          <div className="operation-breakdown">
            {Object.entries(summary.operation_breakdown).map(([op, count]) => (
              <div key={op} className="operation-row">
                <span className="operation-name">{op.replace(/_/g, ' ')}</span>
                <span className="operation-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default SummaryStats
