function PromptDiffModal({ cachedPrompt, currentPrompt, onClose }) {
  return (
    <div className="prompt-diff-modal">
      <div className="prompt-diff-header">
        <div className="prompt-diff-title">Prompt Comparison</div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="prompt-diff-close">
          ×
        </button>
      </div>
      <div className="prompt-diff-section">
        <div className="prompt-diff-label cached">
          Cached Prompt (returned this result):
        </div>
        <div className="prompt-diff-content cached">
          {cachedPrompt}
        </div>
      </div>
      <div className="prompt-diff-section">
        <div className="prompt-diff-label current">
          Current Prompt (what you asked for):
        </div>
        <div className="prompt-diff-content current">
          {currentPrompt}
        </div>
      </div>
    </div>
  )
}

export default PromptDiffModal
