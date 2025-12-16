import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import './App.css'
import { DEFAULT_LEETCODE_PROMPT, PROMPT_PRESETS } from './promptPresets'

function App() {
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [vimEnabled, setVimEnabled] = useState(true)
  const [testCase, setTestCase] = useState('')
  const [llmPrompt, setLlmPrompt] = useState('')
  const [leetcodeNumber, setLeetcodeNumber] = useState('')
  const [loadingTestCases, setLoadingTestCases] = useState(false)
  const [loadingLeetcode, setLoadingLeetcode] = useState(false)
  const [loadingLlmPrompt, setLoadingLlmPrompt] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState('solution-prompt') // 'solution-prompt', 'test-case', 'llm-prompt', 'admin'
  const [solutionPrompt, setSolutionPrompt] = useState(DEFAULT_LEETCODE_PROMPT)
  const [activePreset, setActivePreset] = useState('default')
  const [metrics, setMetrics] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const outputRef = useRef(null)

  useEffect(() => {
    fetch('http://localhost:5001/api/code')
      .then(res => res.json())
      .then(data => setCode(data.code || ''))
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const runCode = async () => {
    const res = await fetch('http://localhost:5001/api/run', {
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
    setLoadingLlmPrompt(true)
    try {
      const res = await fetch('http://localhost:5001/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: llmPrompt, code })
      })
      const data = await res.json()
      if (data.success) {
        setCode(data.code)
      } else {
        console.error('LLM Error:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    } finally {
      setLoadingLlmPrompt(false)
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

      // Load metrics when opening admin panel
      if (mode === 'admin') {
        loadMetrics()
      }
    }
  }

  const loadMetrics = async () => {
    setLoadingMetrics(true)
    try {
      const [metricsRes, summaryRes] = await Promise.all([
        fetch('http://localhost:5001/api/observability/metrics?limit=50'),
        fetch('http://localhost:5001/api/observability/summary')
      ])

      const metricsData = await metricsRes.json()
      const summaryData = await summaryRes.json()

      if (metricsData.success) {
        setMetrics(metricsData.metrics)
      }
      if (summaryData.success) {
        setSummary(summaryData.summary)
      }
    } catch (error) {
      console.error('Failed to load metrics:', error)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const solveLeetcode = async () => {
    setLoadingLeetcode(true)
    setSidebarOpen(false)
    try {
      // Replace {PROBLEM_NUMBER} placeholder with actual number
      const customPrompt = solutionPrompt.replace(/{PROBLEM_NUMBER}/g, leetcodeNumber)

      const res = await fetch('http://localhost:5001/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_number: leetcodeNumber,
          custom_prompt: customPrompt
        })
      })
      const data = await res.json()
      if (data.success) {
        setCode(data.code)
      } else {
        console.error('LeetCode Error:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    } finally {
      setLoadingLeetcode(false)
    }
  }

  const resetPromptToDefault = () => {
    setSolutionPrompt(DEFAULT_LEETCODE_PROMPT)
    setActivePreset('default')
  }

  const applyPreset = (preset) => {
    const modifiedPrompt = PROMPT_PRESETS[preset] || DEFAULT_LEETCODE_PROMPT
    setSolutionPrompt(modifiedPrompt)
    setActivePreset(preset)
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
    setLoadingTestCases(true)
    try {
      const res = await fetch('http://localhost:5001/api/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()
      if (data.success) {
        setTestCase(data.test_cases)
      } else {
        console.error('Generate Test Cases Error:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    } finally {
      setLoadingTestCases(false)
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
            className={`sidebar-toggle-btn ${sidebarOpen && sidebarMode === 'admin' ? 'active' : ''}`}
            onClick={() => toggleSidebar('admin')}
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
        alignItems: 'center'
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
          {(loadingLeetcode || loadingLlmPrompt) && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
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
            {sidebarMode === 'admin' && 'Admin Dashboard'}
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
                <textarea
                  className="sidebar-textarea"
                  value={testCase}
                  onChange={e => setTestCase(e.target.value)}
                  placeholder="Enter test cases or generate them..."
                  style={{ minHeight: '400px' }}
                />
              </div>
              {loadingTestCases && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                </div>
              )}
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
                <label>Prompt Template</label>
                <textarea
                  className="sidebar-textarea"
                  value={solutionPrompt}
                  onChange={(e) => {
                    setSolutionPrompt(e.target.value)
                    setActivePreset(null)
                  }}
                  placeholder="Enter your custom prompt..."
                />
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

        {/* Admin Panel */}
        {sidebarMode === 'admin' && (
          <>
            <div className="sidebar-content">
              {loadingMetrics ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  {summary && (
                    <div className="sidebar-section">
                      <label>Summary Statistics</label>
                      <div className="admin-stats-grid">
                        <div className="stat-card">
                          <div className="stat-label">Total Calls</div>
                          <div className="stat-value">{summary.total_calls}</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">Success Rate</div>
                          <div className="stat-value">
                            {summary.total_calls > 0
                              ? Math.round((summary.successful_calls / summary.total_calls) * 100)
                              : 0}%
                          </div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">Total Tokens</div>
                          <div className="stat-value">{summary.total_tokens.toLocaleString()}</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">Avg Latency</div>
                          <div className="stat-value">{summary.avg_latency_ms}ms</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operation Breakdown */}
                  {summary && summary.operation_breakdown && (
                    <div className="sidebar-section">
                      <label>Operation Breakdown</label>
                      <div className="operation-breakdown">
                        {Object.entries(summary.operation_breakdown).map(([op, count]) => (
                          <div key={op} className="operation-row">
                            <span className="operation-name">{op.replace(/_/g, ' ')}</span>
                            <span className="operation-count">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Calls */}
                  <div className="sidebar-section">
                    <label>Recent LLM Calls ({metrics.length})</label>
                    <div className="metrics-list">
                      {metrics.map((metric, idx) => (
                        <div key={idx} className="metric-card">
                          <div className="metric-header">
                            <span className={`metric-status ${metric.success ? 'success' : 'error'}`}>
                              {metric.success ? '✓' : '✗'}
                            </span>
                            <span className="metric-operation">{metric.operation_type}</span>
                            <span className="metric-time">{new Date(metric.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="metric-details">
                            <div className="metric-detail">
                              <span className="detail-label">Tokens:</span>
                              <span className="detail-value">
                                {metric.tokens_sent} → {metric.tokens_received} ({metric.total_tokens} total)
                              </span>
                            </div>
                            <div className="metric-detail">
                              <span className="detail-label">Latency:</span>
                              <span className="detail-value">{Math.round(metric.latency_ms)}ms</span>
                            </div>
                            {metric.error && (
                              <div className="metric-detail error">
                                <span className="detail-label">Error:</span>
                                <span className="detail-value">{metric.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="sidebar-footer">
              <button onClick={loadMetrics}>
                Refresh Metrics
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
