import TestCasePanel from './TestCasePanel'
import LLMPromptPanel from './LLMPromptPanel'
import SolutionPromptPanel from './SolutionPromptPanel'

function AppSidebar({
  sidebarOpen,
  sidebarMode,
  setSidebarOpen,
  // Test Case Panel props
  testCase,
  setTestCase,
  lastTestCaseUpdate,
  testCaseCacheHit,
  generateTestCases,
  importTestCase,
  clearTestCases,
  // LLM Prompt Panel props
  llmPrompt,
  setLlmPrompt,
  applyLlmPrompt,
  // Solution Prompt Panel props
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
  getPresetButtonStyle
}) {
  return (
    <>
      {/* Unified Sidebar */}
      {sidebarOpen && (
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>
            {sidebarMode === 'test-case' && 'Test Cases'}
            {sidebarMode === 'llm-prompt' && 'LLM Prompt'}
            {sidebarMode === 'solution-prompt' && 'Solution Prompt Manager'}
          </h2>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        {/* Test Case Panel */}
        {sidebarMode === 'test-case' && (
          <TestCasePanel
            testCase={testCase}
            setTestCase={setTestCase}
            lastTestCaseUpdate={lastTestCaseUpdate}
            testCaseCacheHit={testCaseCacheHit}
            generateTestCases={generateTestCases}
            importTestCase={importTestCase}
            clearTestCases={clearTestCases}
          />
        )}

        {/* LLM Prompt Panel */}
        {sidebarMode === 'llm-prompt' && (
          <LLMPromptPanel
            llmPrompt={llmPrompt}
            setLlmPrompt={setLlmPrompt}
            applyLlmPrompt={applyLlmPrompt}
          />
        )}

        {/* Solution Prompt Panel */}
        {sidebarMode === 'solution-prompt' && (
          <SolutionPromptPanel
            leetcodeNumber={leetcodeNumber}
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
            getPresetButtonStyle={getPresetButtonStyle}
            setSidebarOpen={setSidebarOpen}
          />
        )}
      </div>
    </>
  )
}

export default AppSidebar
