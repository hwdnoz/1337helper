function RagChunksModal({ ragChunks, onClose }) {
  return (
    <div className="prompt-diff-modal">
      <div className="prompt-diff-header">
        <div className="prompt-diff-title">RAG Retrieved Chunks ({ragChunks.length})</div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="prompt-diff-close">
          ×
        </button>
      </div>
      {ragChunks.map((chunk, idx) => (
        <div key={idx} className="prompt-diff-section">
          <div className="prompt-diff-label cached">
            Chunk {idx + 1} - Similarity: {(chunk.similarity_score * 100).toFixed(1)}%
            {chunk.metadata?.chunk_index !== undefined && ` (Chunk ${chunk.metadata.chunk_index}/${chunk.metadata.chunk_count - 1})`}
          </div>
          <div className="prompt-diff-content cached" style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            {chunk.content}
          </div>
        </div>
      ))}
    </div>
  )
}

export default RagChunksModal
