import TestCasePanel from './TestCasePanel'
import LLMPromptPanel from './LLMPromptPanel'
import SolutionPromptPanel from './SolutionPromptPanel'

function AppSidebar({
  ui,
  setUi,
  content,
  setContent,
  metadata,
  generateTestCases,
  importTestCase,
  clearTestCases,
  applyLlmPrompt,
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
  startJob
}) {
  return (
    <>
      {ui.sidebarOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setUi(prev => ({ ...prev, sidebarOpen: false }))}
        />
      )}
      <div className={`sidebar ${ui.sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>
            {ui.sidebarMode === 'test-case' && 'Test Cases'}
            {ui.sidebarMode === 'llm-prompt' && 'LLM Prompt'}
            {ui.sidebarMode === 'solution-prompt' && 'Solution Prompt Manager'}
          </h2>
          <button
            className="sidebar-close"
            onClick={() => setUi(prev => ({ ...prev, sidebarOpen: false }))}
          >
            ×
          </button>
        </div>

        {ui.sidebarMode === 'test-case' && (
          <TestCasePanel
            content={content}
            setContent={setContent}
            metadata={metadata}
            generateTestCases={generateTestCases}
            importTestCase={importTestCase}
            clearTestCases={clearTestCases}
            startJob={startJob}
          />
        )}

        {ui.sidebarMode === 'llm-prompt' && (
          <LLMPromptPanel
            content={content}
            setContent={setContent}
            applyLlmPrompt={applyLlmPrompt}
            startJob={startJob}
          />
        )}

        {ui.sidebarMode === 'solution-prompt' && (
          <SolutionPromptPanel
            content={content}
            basePrompt={basePrompt}
            setBasePrompt={setBasePrompt}
            promptModifier={promptModifier}
            setPromptModifier={setPromptModifier}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            loadingBasePrompt={loadingBasePrompt}
            applyPreset={applyPreset}
            resetPromptToDefault={resetPromptToDefault}
            solveLeetcode={solveLeetcode}
            setUi={setUi}
            startJob={startJob}
          />
        )}
      </div>
    </>
  )
}

export default AppSidebar
