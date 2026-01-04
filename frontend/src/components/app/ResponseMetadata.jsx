import PromptDiffModal from './PromptDiffModal'

function ResponseMetadata({ metadata, setMetadata, ui, setUi }) {
  if (!metadata.lastUpdate) return null

  return (
    <div className={`response-metadata ${metadata.cacheHit ? 'cache-hit' : 'cache-miss'}`}>
      {metadata.cacheHit && <span className="cache-lightning">⚡</span>}
      Last updated: {metadata.lastUpdate.toLocaleTimeString()}
      {metadata.cacheHit && !metadata.semanticCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
      {metadata.semanticCacheHit && (
        <span
          className="semantic-cache-link"
          onClick={() => setUi(prev => ({ ...prev, showPromptDiff: !prev.showPromptDiff }))}
          title={metadata.cachedPrompt && metadata.currentPrompt ? 'Click to see prompt differences' : ''}
        >
          (semantic cache {metadata.similarityScore ? `${(metadata.similarityScore * 100).toFixed(0)}%` : ''})
          {metadata.cachedPrompt && metadata.currentPrompt && ui.showPromptDiff && (
            <PromptDiffModal
              cachedPrompt={metadata.cachedPrompt}
              currentPrompt={metadata.currentPrompt}
              onClose={() => setUi(prev => ({ ...prev, showPromptDiff: false }))}
            />
          )}
        </span>
      )}
      {metadata.ragDocCount !== undefined && (
        <span style={{ marginLeft: '8px', color: metadata.ragDocCount > 0 ? '#4CAF50' : '#999' }}>
          📚 RAG: {metadata.ragDocCount} doc{metadata.ragDocCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

export default ResponseMetadata
