function LLMPromptPanel({
  content,
  setContent,
  applyLlmPrompt
}) {
  return (
    <>
      <div className="sidebar-content">
        <div className="sidebar-info">
          Enter instructions to modify your current code using AI.
        </div>
        <div className="sidebar-section">
          <label>Modification Instructions</label>
          <textarea
            className="sidebar-textarea"
            value={content.llmPrompt}
            onChange={e => setContent(prev => ({ ...prev, llmPrompt: e.target.value }))}
            placeholder="E.g., 'Add error handling', 'Optimize for performance', 'Add type hints'..."
            style={{ minHeight: '400px' }}
          />
        </div>
      </div>
      <div className="sidebar-footer">
        <button onClick={applyLlmPrompt}>
          Apply Prompt
        </button>
      </div>
    </>
  )
}

export default LLMPromptPanel
