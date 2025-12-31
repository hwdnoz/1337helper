import PromptDiffModal from './PromptDiffModal'

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
    <div className={`cache-indicator ${cacheHit ? 'hit' : 'miss'}`}>
      {cacheHit && <span className="cache-lightning">⚡</span>}
      Last updated: {lastUpdate.toLocaleTimeString()}
      {cacheHit && !semanticCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
      {semanticCacheHit && (
        <span
          className="semantic-cache-link"
          onClick={() => setShowPromptDiff(!showPromptDiff)}
          title={cachedPrompt && currentPrompt ? 'Click to see prompt differences' : ''}
        >
          (semantic cache {similarityScore ? `${(similarityScore * 100).toFixed(0)}%` : ''})
          {cachedPrompt && currentPrompt && showPromptDiff && (
            <PromptDiffModal
              cachedPrompt={cachedPrompt}
              currentPrompt={currentPrompt}
              onClose={() => setShowPromptDiff(false)}
            />
          )}
        </span>
      )}
    </div>
  )
}

export default CacheIndicator
