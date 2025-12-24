import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import './App.css'
import { API_URL } from './config'
import { useJobManager } from './hooks/useJobManager'
import { usePromptLoader } from './hooks/usePromptLoader'
import JobQueue from './components/JobQueue'

function App() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [vimEnabled, setVimEnabled] = useState(true)
  const [testCase, setTestCase] = useState('')
  const [llmPrompt, setLlmPrompt] = useState('')
  const [leetcodeNumber, setLeetcodeNumber] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState('solution-prompt')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [cacheHit, setCacheHit] = useState(false)
  const [semanticCacheHit, setSemanticCacheHit] = useState(false)
  const [similarityScore, setSimilarityScore] = useState(null)
  const [cachedPrompt, setCachedPrompt] = useState(null)
  const [currentPrompt, setCurrentPrompt] = useState(null)
  const [showPromptDiff, setShowPromptDiff] = useState(false)
  const [lastTestCaseUpdate, setLastTestCaseUpdate] = useState(null)
  const [testCaseCacheHit, setTestCaseCacheHit] = useState(false)
  const outputRef = useRef(null)

  // Custom hooks for job management and prompt loading
  const {
    jobs,
    currentJobId,
    currentJobStatus,
    currentJobMessage,
    startJob,
    clearCompletedJobs
  } = useJobManager()

  const {
    basePrompt,
    promptModifier,
    activePreset,
    loadingBasePrompt,
    applyPreset,
    resetPromptToDefault,
    getFinalPrompt,
    setPromptModifier
  } = usePromptLoader(leetcodeNumber)

  useEffect(() => {
    fetch(`${API_URL}/api/code`)
      .then(res => res.json())
      .then(data => setCode(data.code || ''))
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // Update UI when job completes successfully
  useEffect(() => {
    if (currentJobStatus === 'SUCCESS') {
      const currentJob = jobs.find(j => j.id === currentJobId)
      if (currentJob && currentJob.result && currentJob.result.success) {
        // Handle different result types based on what fields exist
        if (currentJob.result.response) {
          // LeetCode job - update code editor
          setCode(currentJob.result.response)
        } else if (currentJob.result.code) {
          // Code modification job - update code editor
          setCode(currentJob.result.code)
        } else if (currentJob.result.test_cases) {
          // Test case generation job - update test case window
          setTestCase(currentJob.result.test_cases)
          setLastTestCaseUpdate(new Date())
          setTestCaseCacheHit(currentJob.result.from_cache || false)
          return // Don't update lastUpdate for test cases
        }

        setLastUpdate(new Date())
        setCacheHit(currentJob.result.from_cache || false)
        setSemanticCacheHit(currentJob.result.semantic_cache_hit || false)
        setSimilarityScore(currentJob.result.similarity_score || null)
        setCachedPrompt(currentJob.result.cached_prompt || null)
        setCurrentPrompt(currentJob.result.current_prompt || null)
      }
    }
  }, [currentJobStatus, currentJobId, jobs])

  const runCode = async () => {
    const res = await fetch(`${API_URL}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    const data = await res.json()
    const result = data.success ? data.stdout : `Error: ${data.error}`
    setOutput(prev => prev ? `${prev}\n---\n${result}` : result)
  }

  const importTestCase = () => {
    // Find if __name__ == '__main__' block and insert test case there
    const lines = code.split('\n')
    let mainBlockIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("if __name__")) {
        mainBlockIndex = i
        break
      }
    }

    if (mainBlockIndex === -1) {
      // No main block exists, add one at the end
      const newCode = code + '\n\nif __name__ == "__main__":\n    ' + testCase.split('\n').join('\n    ')
      setCode(newCode)
    } else {
      // Insert after the if __name__ line
      const indent = '    '
      const indentedTestCase = testCase.split('\n').map(line => indent + line).join('\n')
      lines.splice(mainBlockIndex + 1, 0, indentedTestCase)
      setCode(lines.join('\n'))
    }
  }

  const clearTestCases = () => {
    // Remove content from __name__ == '__main__' block
    const lines = code.split('\n')
    let mainBlockIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("if __name__")) {
        mainBlockIndex = i
        break
      }
    }

    if (mainBlockIndex === -1) {
      // No main block exists, nothing to clear
      return
    }

    // Find the end of the main block (next non-indented line or end of file)
    let endIndex = lines.length
    for (let i = mainBlockIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      // If we hit a non-empty line that's not indented, we've left the main block
      if (line.trim() && !line.startsWith('    ') && !line.startsWith('\t')) {
        endIndex = i
        break
      }
    }

    // Remove all lines between mainBlockIndex + 1 and endIndex
    lines.splice(mainBlockIndex + 1, endIndex - mainBlockIndex - 1)
    setCode(lines.join('\n'))
  }

  const applyLlmPrompt = async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/code-modification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: llmPrompt, code })
      })
      const data = await res.json()

      if (data.job_id) {
        startJob(data.job_id, 'LLM')
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    }
  }

  const openSolutionPromptManager = () => {
    if (!leetcodeNumber) {
      alert('Please enter a problem number first')
      return
    }
    setSidebarMode('solution-prompt')
    setSidebarOpen(true)
  }

  const toggleSidebar = (mode) => {
    if (sidebarOpen && sidebarMode === mode) {
      setSidebarOpen(false)
    } else {
      setSidebarMode(mode)
      setSidebarOpen(true)
    }
  }

  const solveLeetcode = async () => {
    setSidebarOpen(false)
    try {
      const res = await fetch(`${API_URL}/api/jobs/leetcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_number: leetcodeNumber,
          custom_prompt: getFinalPrompt()
        })
      })
      const data = await res.json()

      if (data.job_id) {
        startJob(data.job_id, leetcodeNumber)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    }
  }

  const getPresetButtonStyle = (preset) => {
    const isActive = activePreset === preset
    return {
      padding: '0.5rem',
      fontSize: '0.85rem',
      background: isActive ? '#0e639c' : '#555',
      border: isActive ? '2px solid #1177bb' : '2px solid transparent',
      fontWeight: isActive ? '600' : '400',
      position: 'relative'
    }
  }

  const generateTestCases = async () => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()

      if (data.job_id) {
        startJob(data.job_id, 'Tests')
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    }
  }

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Code Runner</h1>

        {/* Sidebar Toggle Buttons */}
        <div className="sidebar-toggles">
          <button
            className={`sidebar-toggle-btn ${sidebarOpen && sidebarMode === 'test-case' ? 'active' : ''}`}
            onClick={() => toggleSidebar('test-case')}
          >
            Test Cases
          </button>
          <button
            className={`sidebar-toggle-btn ${sidebarOpen && sidebarMode === 'llm-prompt' ? 'active' : ''}`}
            onClick={() => toggleSidebar('llm-prompt')}
          >
            LLM Prompt
          </button>
          <button
            className={`sidebar-toggle-btn ${sidebarOpen && sidebarMode === 'solution-prompt' ? 'active' : ''}`}
            onClick={() => toggleSidebar('solution-prompt')}
          >
            Solution Prompt
          </button>
          <button
            className="sidebar-toggle-btn"
            onClick={() => navigate('/admin')}
          >
            Admin
          </button>
        </div>
      </div>

      <div style={{
        background: '#1e1e1e',
        border: '1px solid #3e3e42',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '2px',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>LeetCode Problem:</div>
        <input
          type="number"
          value={leetcodeNumber}
          onChange={e => setLeetcodeNumber(e.target.value)}
          placeholder="e.g., 70"
          style={{
            width: '100px',
            background: '#2d2d2d',
            color: '#d4d4d4',
            border: '1px solid #3e3e42',
            borderRadius: '2px',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}
        />
        <button onClick={openSolutionPromptManager}>Solve</button>
      </div>

      {/* Job Status Display - All Jobs */}
      <JobQueue
        jobs={jobs}
        currentJobId={currentJobId}
        onClearCompleted={clearCompletedJobs}
      />
      <div className="container">
        <div style={{ flex: '2', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => setVimEnabled(!vimEnabled)}
              style={{
                background: vimEnabled ? '#0e639c' : '#555',
                opacity: vimEnabled ? 1 : 0.6
              }}
            >
              {vimEnabled ? '✓ ' : ''}Vim
            </button>
            <button onClick={runCode}>Run</button>
            <button onClick={importTestCase}>Import Test Cases</button>
            <button onClick={clearTestCases}>Clear Test Cases</button>
          </div>
          {lastUpdate && (
            <div style={{
              fontSize: '0.85rem',
              color: cacheHit ? '#4caf50' : '#888',
              padding: '0.25rem 0.5rem',
              background: cacheHit ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
              borderRadius: '2px',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {cacheHit && <span style={{ fontSize: '1rem' }}>⚡</span>}
              Last updated: {lastUpdate.toLocaleTimeString()}
              {cacheHit && !semanticCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
              {semanticCacheHit && (
                <span
                  style={{
                    fontWeight: 'bold',
                    color: '#9c27b0',
                    cursor: 'pointer',
                    position: 'relative',
                    borderBottom: '1px dotted #9c27b0'
                  }}
                  onClick={() => setShowPromptDiff(!showPromptDiff)}
                  title={cachedPrompt && currentPrompt ? 'Click to see prompt differences' : ''}
                >
                  (semantic cache {similarityScore ? `${(similarityScore * 100).toFixed(0)}%` : ''})
                  {cachedPrompt && currentPrompt && showPromptDiff && (
                    <div style={{
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#1e1e1e',
                      border: '1px solid #9c27b0',
                      borderRadius: '4px',
                      padding: '1rem',
                      minWidth: '500px',
                      maxWidth: '700px',
                      maxHeight: '500px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      zIndex: 9999,
                      boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
                      fontSize: '0.85rem',
                      lineHeight: '1.4'
                    }}
                    className="prompt-diff-tooltip"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          Prompt Comparison
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowPromptDiff(false)
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#d4d4d4',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0',
                            lineHeight: '1'
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ color: '#4caf50', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                          Cached Prompt (returned this result):
                        </div>
                        <div style={{
                          background: 'rgba(76, 175, 80, 0.1)',
                          padding: '0.5rem',
                          borderRadius: '3px',
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          color: '#d4d4d4',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {cachedPrompt}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#2196f3', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                          Current Prompt (what you asked for):
                        </div>
                        <div style={{
                          background: 'rgba(33, 150, 243, 0.1)',
                          padding: '0.5rem',
                          borderRadius: '3px',
                          border: '1px solid rgba(33, 150, 243, 0.3)',
                          color: '#d4d4d4',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {currentPrompt}
                        </div>
                      </div>
                    </div>
                  )}
                </span>
              )}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeMirror
              value={code}
              onChange={setCode}
              extensions={vimEnabled ? [python(), vim()] : [python()]}
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
                foldGutter: true
              }}
              style={{ fontSize: 14, height: '100%', overflow: 'auto' }}
            />
          </div>
        </div>
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ marginBottom: '0.5rem', color: '#d4d4d4', flexShrink: 0 }}>Output</div>
          <pre ref={outputRef} style={{ flex: 1, minHeight: 0 }}>{output}</pre>
        </div>
      </div>

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
          <>
            <div className="sidebar-content">
              <div className="sidebar-info">
                Generate or write test cases for your code. Click "Import Test Cases" to add them to your code.
              </div>
              <div className="sidebar-section">
                <label>Test Cases</label>
                {lastTestCaseUpdate && (
                  <div style={{
                    fontSize: '0.85rem',
                    color: testCaseCacheHit ? '#4caf50' : '#888',
                    padding: '0.25rem 0.5rem',
                    background: testCaseCacheHit ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                    borderRadius: '2px',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {testCaseCacheHit && <span style={{ fontSize: '1rem' }}>⚡</span>}
                    Last updated: {lastTestCaseUpdate.toLocaleTimeString()}
                    {testCaseCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
                  </div>
                )}
                <textarea
                  className="sidebar-textarea"
                  value={testCase}
                  onChange={e => setTestCase(e.target.value)}
                  placeholder="Enter test cases or generate them..."
                  style={{ minHeight: '400px' }}
                />
              </div>
            </div>
            <div className="sidebar-footer">
              <button onClick={generateTestCases}>
                Generate Test Cases
              </button>
              <button onClick={importTestCase}>
                Import Test Cases
              </button>
              <button onClick={clearTestCases} style={{ background: '#555' }}>
                Clear Test Cases
              </button>
            </div>
          </>
        )}

        {/* LLM Prompt Panel */}
        {sidebarMode === 'llm-prompt' && (
          <>
            <div className="sidebar-content">
              <div className="sidebar-info">
                Enter instructions to modify your current code using AI.
              </div>
              {lastUpdate && (
                <div style={{
                  fontSize: '0.85rem',
                  color: cacheHit ? '#4caf50' : '#888',
                  padding: '0.25rem 0.5rem',
                  background: cacheHit ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                  borderRadius: '2px',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {cacheHit && <span style={{ fontSize: '1rem' }}>⚡</span>}
                  Last updated: {lastUpdate.toLocaleTimeString()}
                  {cacheHit && !semanticCacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
                  {semanticCacheHit && (
                    <span
                      style={{
                        fontWeight: 'bold',
                        color: '#9c27b0',
                        cursor: 'pointer',
                        position: 'relative',
                        borderBottom: '1px dotted #9c27b0'
                      }}
                      onClick={() => setShowPromptDiff(!showPromptDiff)}
                      title={cachedPrompt && currentPrompt ? 'Click to see prompt differences' : ''}
                    >
                      (semantic cache {similarityScore ? `${(similarityScore * 100).toFixed(0)}%` : ''})
                      {cachedPrompt && currentPrompt && showPromptDiff && (
                        <div style={{
                          position: 'fixed',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          background: '#1e1e1e',
                          border: '1px solid #9c27b0',
                          borderRadius: '4px',
                          padding: '1rem',
                          minWidth: '500px',
                          maxWidth: '700px',
                          maxHeight: '500px',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          zIndex: 9999,
                          boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
                          fontSize: '0.85rem',
                          lineHeight: '1.4'
                        }}
                        className="prompt-diff-tooltip"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              Prompt Comparison
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowPromptDiff(false)
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#d4d4d4',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                padding: '0',
                                lineHeight: '1'
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ color: '#4caf50', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                              Cached Prompt (returned this result):
                            </div>
                            <div style={{
                              background: 'rgba(76, 175, 80, 0.1)',
                              padding: '0.5rem',
                              borderRadius: '3px',
                              border: '1px solid rgba(76, 175, 80, 0.3)',
                              color: '#d4d4d4',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              maxHeight: '200px',
                              overflowY: 'auto'
                            }}>
                              {cachedPrompt}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#2196f3', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                              Current Prompt (what you asked for):
                            </div>
                            <div style={{
                              background: 'rgba(33, 150, 243, 0.1)',
                              padding: '0.5rem',
                              borderRadius: '3px',
                              border: '1px solid rgba(33, 150, 243, 0.3)',
                              color: '#d4d4d4',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontFamily: 'monospace',
                              maxHeight: '200px',
                              overflowY: 'auto'
                            }}>
                              {currentPrompt}
                            </div>
                          </div>
                        </div>
                      )}
                    </span>
                  )}
                </div>
              )}
              <div className="sidebar-section">
                <label>Modification Instructions</label>
                <textarea
                  className="sidebar-textarea"
                  value={llmPrompt}
                  onChange={e => setLlmPrompt(e.target.value)}
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
        )}

        {/* Solution Prompt Panel */}
        {sidebarMode === 'solution-prompt' && (
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
        )}
      </div>
    </div>
  )
}

export default App
