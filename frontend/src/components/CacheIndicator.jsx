function CacheIndicator({
  lastUpdate,
  cacheHit,
  semanticCacheHit,
  similarityScore,
  cachedPrompt,
  currentPrompt,
  showPromptDiff,
  setShowPromptDiff
}) {
  if (!lastUpdate) return null

  return (
    <div style={{
      fontSize: '0.85rem',
      color: cacheHit ? '#4caf50' : '#888',
      padding: '0.25rem 0.5rem',
      background: cacheHit ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
      borderRadius: '2px',
      marginBottom: '0.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      {cacheHit && <span style={{ fontSize: '1rem' }}>⚡</span>}
      Last updated: {lastUpdate.toLocaleTimeString()}
      {cacheHit && !semanticCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
      {semanticCacheHit && (
        <span
          style={{
            fontWeight: 'bold',
            color: '#9c27b0',
            cursor: 'pointer',
            position: 'relative',
            borderBottom: '1px dotted #9c27b0'
          }}
          onClick={() => setShowPromptDiff(!showPromptDiff)}
          title={cachedPrompt && currentPrompt ? 'Click to see prompt differences' : ''}
        >
          (semantic cache {similarityScore ? `${(similarityScore * 100).toFixed(0)}%` : ''})
        </span>
      )}
    </div>
  )
}

export default CacheIndicator
