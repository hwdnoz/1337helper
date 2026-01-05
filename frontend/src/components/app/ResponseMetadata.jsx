import PromptDiffModal from './PromptDiffModal'
import RagChunksModal from './RagChunksModal'

function ResponseMetadata({ metadata, setMetadata, ui, setUi }) {
  if (!metadata.lastUpdate) return null

  console.log('[Metadata Debug] Full metadata:', metadata)
  console.log('[Metadata Debug] Full ui:', ui)
  if (metadata.ragDocCount > 0) {
    console.log('[RAG Debug] ragDocCount:', metadata.ragDocCount)
    console.log('[RAG Debug] ragChunks:', metadata.ragChunks)
    console.log('[RAG Debug] showRagChunks:', ui.showRagChunks)
  }

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
      {metadata.ragDocCount !== undefined && metadata.ragDocCount > 0 && (
        <span
          className="semantic-cache-link"
          onClick={() => setUi(prev => ({ ...prev, showRagChunks: !prev.showRagChunks }))}
          title="Click to see retrieved RAG chunks"
          style={{ marginLeft: '8px', color: '#4CAF50' }}
        >
          📚 RAG: {metadata.ragDocCount} chunk{metadata.ragDocCount !== 1 ? 's' : ''}
          {metadata.ragChunks && metadata.ragChunks.length > 0 && ui.showRagChunks && (
            <RagChunksModal
              ragChunks={metadata.ragChunks}
              onClose={() => setUi(prev => ({ ...prev, showRagChunks: false }))}
            />
          )}
        </span>
      )}
      {metadata.ragDocCount !== undefined && metadata.ragDocCount === 0 && (
        <span style={{ marginLeft: '8px', color: '#999' }}>
          📚 RAG: 0 chunks
        </span>
      )}
      {(metadata.tokensSent || metadata.tokensReceived) && (
        <span style={{ marginLeft: '8px', color: '#888', fontSize: '0.9em' }}>
          | 🪙 Tokens: {metadata.tokensSent || 0} → {metadata.tokensReceived || 0}
        </span>
      )}
    </div>
  )
}

export default ResponseMetadata
