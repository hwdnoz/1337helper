import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import './App.css'
import { PROMPT_MODIFIERS } from './promptPresets'
import { API_URL } from './config'

function App() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [vimEnabled, setVimEnabled] = useState(true)
  const [testCase, setTestCase] = useState('')
  const [llmPrompt, setLlmPrompt] = useState('')
  const [leetcodeNumber, setLeetcodeNumber] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarMode, setSidebarMode] = useState('solution-prompt') // 'solution-prompt', 'test-case', 'llm-prompt'
  const [basePrompt, setBasePrompt] = useState('')
  const [basePromptTemplate, setBasePromptTemplate] = useState('') // Raw template from backend
  const [promptModifier, setPromptModifier] = useState('')
  const [activePreset, setActivePreset] = useState('default')
  const [loadingBasePrompt, setLoadingBasePrompt] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [cacheHit, setCacheHit] = useState(false)
  const [lastTestCaseUpdate, setLastTestCaseUpdate] = useState(null)
  const [testCaseCacheHit, setTestCaseCacheHit] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [jobMessage, setJobMessage] = useState('')
  const [jobs, setJobs] = useState([]) // Array of {id, status, message, problemNumber, timestamp}
  const outputRef = useRef(null)
  const pollingIntervalRef = useRef(null)
  const jobPollingIntervals = useRef({})

  useEffect(() => {
    fetch(`${API_URL}/api/code`)
      .then(res => res.json())
      .then(data => setCode(data.code || ''))
  }, [])

  // Load base prompt template from admin defaults
  useEffect(() => {
    const loadBasePrompt = async () => {
      setLoadingBasePrompt(true)
      try {
        const res = await fetch(`${API_URL}/api/prompts/leetcode_solve`)
        const data = await res.json()
        if (data.success) {
          setBasePromptTemplate(data.prompt.content)
        }
      } catch (error) {
        console.error('Failed to load base prompt:', error)
      } finally {
        setLoadingBasePrompt(false)
      }
    }
    loadBasePrompt()
  }, [])

  // Update base prompt when template or leetcode number changes
  useEffect(() => {
    if (basePromptTemplate) {
      const replaced = basePromptTemplate
        .replace(/\{problem_number\}/g, leetcodeNumber || '{problem_number}')
        .replace(/#\{problem_number\}/g, leetcodeNumber || '#{problem_number}')
      setBasePrompt(replaced)
    }
  }, [basePromptTemplate, leetcodeNumber])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // Check for active jobs on mount and resume polling if needed
  useEffect(() => {
    const savedJobsStr = localStorage.getItem('activeJobs')

    if (savedJobsStr) {
      try {
        const savedJobs = JSON.parse(savedJobsStr)
        const now = Date.now()

        // Filter jobs that are less than 10 minutes old
        const validJobs = savedJobs.filter(job => {
          const elapsed = now - job.timestamp
          return elapsed < 600000 // 10 minutes
        })

        if (validJobs.length > 0) {
          setJobs(validJobs)

          // Start polling for each job
          validJobs.forEach(job => {
            jobPollingIntervals.current[job.id] = setInterval(() => {
              pollJobStatus(job.id)
            }, 2000)
            // Poll immediately
            pollJobStatus(job.id)
          })

          // Set the most recent job as the "current" job
          const mostRecent = validJobs[validJobs.length - 1]
          setJobId(mostRecent.id)
          setJobStatus(mostRecent.status)
          setJobMessage(mostRecent.message)
        } else {
          localStorage.removeItem('activeJobs')
        }
      } catch (error) {
        console.error('Error loading jobs from localStorage:', error)
        localStorage.removeItem('activeJobs')
      }
    }

    // Cleanup on unmount
    return () => {
      Object.values(jobPollingIntervals.current).forEach(interval => clearInterval(interval))
    }
  }, [])

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
        const newJob = {
          id: data.job_id,
          status: 'PENDING',
          message: 'Code modification job submitted...',
          problemNumber: 'LLM',
          timestamp: Date.now()
        }

        setJobs(prevJobs => [...prevJobs, newJob])
        setJobId(data.job_id)
        setJobStatus('PENDING')
        setJobMessage('Code modification job submitted...')

        const updatedJobs = [...jobs, newJob]
        localStorage.setItem('activeJobs', JSON.stringify(updatedJobs))

        jobPollingIntervals.current[data.job_id] = setInterval(() => {
          pollJobStatus(data.job_id)
        }, 2000)
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

  const pollJobStatus = async (currentJobId) => {
    try {
      const res = await fetch(`${API_URL}/api/jobs/${currentJobId}`)
      const data = await res.json()

      // Determine if job is terminal (completed or failed)
      const isTerminal = data.state === 'SUCCESS' || data.state === 'FAILURE'

      if (isTerminal) {
        // Stop polling this specific job
        if (jobPollingIntervals.current[currentJobId]) {
          clearInterval(jobPollingIntervals.current[currentJobId])
          delete jobPollingIntervals.current[currentJobId]
        }
      }

      // Update jobs array with new status
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === currentJobId
            ? {
                ...job,
                status: data.state,
                message: data.state === 'SUCCESS' ? 'Completed' :
                         data.state === 'FAILURE' ? `Failed: ${data.error || 'Unknown error'}` :
                         data.status,
                completed: isTerminal
              }
            : job
        )
      )

      // Update main status display if this is the current job
      if (currentJobId === jobId) {
        setJobStatus(data.state)
        setJobMessage(data.state === 'SUCCESS' ? 'Job completed successfully!' :
                      data.state === 'FAILURE' ? `Job failed: ${data.error}` :
                      data.status)
      }

      // Update appropriate UI elements when ANY job completes successfully
      if (data.state === 'SUCCESS' && data.result && data.result.success) {
        // Handle different result types based on what fields exist
        if (data.result.response) {
          // LeetCode job - update code editor
          setCode(data.result.response)
        } else if (data.result.code) {
          // Code modification job - update code editor
          setCode(data.result.code)
        } else if (data.result.test_cases) {
          // Test case generation job - update test case window
          setTestCase(data.result.test_cases)
        }

        setLastUpdate(new Date())
        setCacheHit(data.result.from_cache || false)
        // Update jobId to track the most recently completed job
        setJobId(currentJobId)
      }

      // Update localStorage if terminal state
      if (isTerminal) {
        updateJobsInLocalStorage()
      }
    } catch (error) {
      console.error('Polling Error:', error)
    }
  }

  const updateJobsInLocalStorage = () => {
    setJobs(prevJobs => {
      const activeJobs = prevJobs.filter(job => job.status !== 'SUCCESS' && job.status !== 'FAILURE')
      localStorage.setItem('activeJobs', JSON.stringify(activeJobs))
      return prevJobs
    })
  }

  const solveLeetcode = async () => {
    setSidebarOpen(false)
    try {
      // Combine base prompt + modifier (placeholders already replaced in basePrompt)
      const customPrompt = basePrompt + promptModifier

      // Always use async job endpoint
      const res = await fetch(`${API_URL}/api/jobs/leetcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_number: leetcodeNumber,
          custom_prompt: customPrompt
        })
      })
      const data = await res.json()

      if (data.job_id) {
        const newJob = {
          id: data.job_id,
          status: 'PENDING',
          message: 'Job submitted, waiting for processing...',
          problemNumber: leetcodeNumber,
          timestamp: Date.now()
        }

        // Add to jobs array
        setJobs(prevJobs => [...prevJobs, newJob])
        setJobId(data.job_id)
        setJobStatus('PENDING')
        setJobMessage('Job submitted, waiting for processing...')

        // Save to localStorage
        const updatedJobs = [...jobs, newJob]
        localStorage.setItem('activeJobs', JSON.stringify(updatedJobs))

        // Start polling for this specific job
        jobPollingIntervals.current[data.job_id] = setInterval(() => {
          pollJobStatus(data.job_id)
        }, 2000)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    }
  }

  const resetPromptToDefault = () => {
    setPromptModifier('')
    setActivePreset('default')
  }

  const applyPreset = (preset) => {
    const modifier = PROMPT_MODIFIERS[preset] || ''
    setPromptModifier(modifier)
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
    try {
      const res = await fetch(`${API_URL}/api/jobs/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      const data = await res.json()

      if (data.job_id) {
        const newJob = {
          id: data.job_id,
          status: 'PENDING',
          message: 'Test case generation job submitted...',
          problemNumber: 'Tests',
          timestamp: Date.now()
        }

        setJobs(prevJobs => [...prevJobs, newJob])
        setJobId(data.job_id)
        setJobStatus('PENDING')
        setJobMessage('Test case generation job submitted...')

        const updatedJobs = [...jobs, newJob]
        localStorage.setItem('activeJobs', JSON.stringify(updatedJobs))

        jobPollingIntervals.current[data.job_id] = setInterval(() => {
          pollJobStatus(data.job_id)
        }, 2000)
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
      {jobs.length > 0 && (
        <div style={{
          background: '#1e1e1e',
          border: '2px solid #0e639c',
          padding: '1rem',
          marginBottom: '1rem',
          borderRadius: '4px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1177bb' }}>
              Background Jobs ({jobs.filter(j => j.status !== 'SUCCESS' && j.status !== 'FAILURE').length} active)
            </div>
            <button
              onClick={() => {
                setJobs(prevJobs => prevJobs.filter(j => j.status !== 'SUCCESS' && j.status !== 'FAILURE'))
                updateJobsInLocalStorage()
              }}
              style={{
                padding: '0.25rem 0.5rem',
                fontSize: '0.8rem',
                background: '#555',
                border: '1px solid #777'
              }}
            >
              Clear Completed
            </button>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {jobs.map((job, index) => (
              <div key={job.id} style={{
                background: '#2d2d2d',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                border: job.id === jobId ? '1px solid #1177bb' : '1px solid #3e3e42'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.5rem', fontSize: '0.85rem', alignItems: 'center' }}>
                  <div style={{ color: '#888' }}>Problem #{job.problemNumber}:</div>
                  <div style={{ fontFamily: 'monospace', color: '#4caf50', fontSize: '0.75rem' }}>
                    {job.id.substring(0, 8)}...
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '2px',
                      background: job.status === 'SUCCESS' ? '#4caf50' :
                                 job.status === 'FAILURE' ? '#f44336' :
                                 job.status === 'STARTED' ? '#ff9800' :
                                 '#888',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.7rem'
                    }}>
                      {job.status}
                    </span>
                    {(job.status === 'PENDING' || job.status === 'STARTED') && (
                      <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.25rem' }}>
                  {job.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
              {cacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
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
                  {cacheHit && <span style={{ fontWeight: 'bold' }}>(from cache)</span>}
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
