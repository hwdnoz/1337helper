import PromptDiffModal from './PromptDiffModal'

function CacheIndicator({ cacheInfo, setCacheInfo, ui, setUi }) {
  if (!cacheInfo.lastUpdate) return null

  return (
    <div className={`cache-indicator ${cacheInfo.cacheHit ? 'hit' : 'miss'}`}>
      {cacheInfo.cacheHit && <span className="cache-lightning">⚡</span>}
      Last updated: {cacheInfo.lastUpdate.toLocaleTimeString()}
      {cacheInfo.cacheHit && !cacheInfo.semanticCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
      {cacheInfo.semanticCacheHit && (
        <span
          className="semantic-cache-link"
          onClick={() => setUi(prev => ({ ...prev, showPromptDiff: !prev.showPromptDiff }))}
          title={cacheInfo.cachedPrompt && cacheInfo.currentPrompt ? 'Click to see prompt differences' : ''}
        >
          (semantic cache {cacheInfo.similarityScore ? `${(cacheInfo.similarityScore * 100).toFixed(0)}%` : ''})
          {cacheInfo.cachedPrompt && cacheInfo.currentPrompt && ui.showPromptDiff && (
            <PromptDiffModal
              cachedPrompt={cacheInfo.cachedPrompt}
              currentPrompt={cacheInfo.currentPrompt}
              onClose={() => setUi(prev => ({ ...prev, showPromptDiff: false }))}
            />
          )}
        </span>
      )}
    </div>
  )
}

export default CacheIndicator
