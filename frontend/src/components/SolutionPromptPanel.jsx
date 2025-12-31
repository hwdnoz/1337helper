function SolutionPromptPanel({
  leetcodeNumber,
  basePrompt,
  setBasePrompt,
  promptModifier,
  setPromptModifier,
  activePreset,
  setActivePreset,
  loadingBasePrompt,
  applyPreset,
  resetPromptToDefault,
  solveLeetcode,
  getPresetButtonStyle,
  setSidebarOpen
}) {
  return (
    <>
      <div className="sidebar-content">
        <div className="sidebar-info">
          Customize the prompt sent to the LLM when solving problem #{leetcodeNumber || 'N/A'}.
          Use {'{PROBLEM_NUMBER}'} as a placeholder for the problem number.
        </div>

        <div className="sidebar-section">
          <label>Quick Presets</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            <button onClick={() => applyPreset('no-comments')} style={getPresetButtonStyle('no-comments')}>
              {activePreset === 'no-comments' && '✓ '}No Comments
            </button>
            <button onClick={() => applyPreset('minimal-comments')} style={getPresetButtonStyle('minimal-comments')}>
              {activePreset === 'minimal-comments' && '✓ '}Minimal Comments
            </button>
            <button onClick={() => applyPreset('concise')} style={getPresetButtonStyle('concise')}>
              {activePreset === 'concise' && '✓ '}Concise
            </button>
            <button onClick={() => applyPreset('detailed')} style={getPresetButtonStyle('detailed')}>
              {activePreset === 'detailed' && '✓ '}Detailed
            </button>
            <button onClick={() => applyPreset('optimal')} style={getPresetButtonStyle('optimal')}>
              {activePreset === 'optimal' && '✓ '}Optimal Solution
            </button>
            <button onClick={resetPromptToDefault} style={getPresetButtonStyle('default')}>
              {activePreset === 'default' && '✓ '}Default
            </button>
          </div>
        </div>

        <div className="sidebar-section">
          <label>Base Prompt (from Admin)</label>
          <textarea
            className="sidebar-textarea"
            value={basePrompt}
            onChange={(e) => setBasePrompt(e.target.value)}
            placeholder={loadingBasePrompt ? "Loading base prompt..." : "Base prompt from admin settings..."}
            style={{ height: '200px', marginBottom: '1rem' }}
            disabled={loadingBasePrompt}
          />

          <label>Style Modifier (Preset Additions)</label>
          <textarea
            className="sidebar-textarea"
            value={promptModifier}
            onChange={(e) => {
              setPromptModifier(e.target.value)
              setActivePreset(null)
            }}
            placeholder="Additional instructions from preset (e.g., 'no comments', 'detailed', etc.)..."
            style={{ height: '150px' }}
          />
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
            These two prompts are combined and sent to the LLM
          </div>
        </div>
      </div>
      <div className="sidebar-footer">
        <button
          onClick={() => setSidebarOpen(false)}
          style={{ background: '#555' }}
        >
          Cancel
        </button>
        <button onClick={solveLeetcode}>
          Solve Problem
        </button>
      </div>
    </>
  )
}

export default SolutionPromptPanel
