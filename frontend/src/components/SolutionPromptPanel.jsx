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
  setSidebarOpen
}) {
  const presets = [
    { id: 'no-comments', label: 'No Comments' },
    { id: 'minimal-comments', label: 'Minimal Comments' },
    { id: 'concise', label: 'Concise' },
    { id: 'detailed', label: 'Detailed' },
    { id: 'optimal', label: 'Optimal Solution' },
    { id: 'default', label: 'Default', onClick: resetPromptToDefault }
  ]

  return (
    <>
      <div className="sidebar-content">
        <div className="sidebar-info">
          Customize the prompt sent to the LLM when solving problem #{leetcodeNumber || 'N/A'}.
          Use {'{PROBLEM_NUMBER}'} as a placeholder for the problem number.
        </div>

        <div className="sidebar-section">
          <label>Quick Presets</label>
          <div className="preset-grid">
            {presets.map(({ id, label, onClick }) => (
              <button
                key={id}
                onClick={() => onClick ? onClick() : applyPreset(id)}
                className={`preset-button ${activePreset === id ? 'active' : ''}`}
              >
                {activePreset === id && '✓ '}{label}
              </button>
            ))}
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
            onChange={(e) => { setPromptModifier(e.target.value); setActivePreset(null); }}
            placeholder="Additional instructions from preset (e.g., 'no comments', 'detailed', etc.)..."
            style={{ height: '150px' }}
          />
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
            These two prompts are combined and sent to the LLM
          </div>
        </div>
      </div>
      <div className="sidebar-footer">
        <button onClick={() => setSidebarOpen(false)} style={{ background: '#555' }}>
          Cancel
        </button>
        <button onClick={solveLeetcode}>Solve Problem</button>
      </div>
    </>
  )
}

export default SolutionPromptPanel
