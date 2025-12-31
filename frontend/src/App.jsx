import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'
import './styles/sidebar.css'
import './styles/components.css'
import { API_URL } from './config'
import { useJobManager } from './hooks/useJobManager'
import { usePromptLoader } from './hooks/usePromptLoader'
import JobQueue from './components/JobQueue'
import Header from './components/Header'
import LeetCodeInput from './components/LeetCodeInput'
import CodeEditorPanel from './components/CodeEditorPanel'
import OutputPanel from './components/OutputPanel'
import AppSidebar from './components/AppSidebar'

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
    setPromptModifier,
    setBasePrompt,
    setActivePreset
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
      <Header
        sidebarOpen={sidebarOpen}
        sidebarMode={sidebarMode}
        toggleSidebar={toggleSidebar}
        navigate={navigate}
      />

      <LeetCodeInput
        leetcodeNumber={leetcodeNumber}
        setLeetcodeNumber={setLeetcodeNumber}
        onSolve={openSolutionPromptManager}
      />

      <JobQueue
        jobs={jobs}
        currentJobId={currentJobId}
        onClearCompleted={clearCompletedJobs}
      />
      <div className="container">
        <CodeEditorPanel
          code={code}
          setCode={setCode}
          vimEnabled={vimEnabled}
          setVimEnabled={setVimEnabled}
          runCode={runCode}
          importTestCase={importTestCase}
          clearTestCases={clearTestCases}
          lastUpdate={lastUpdate}
          cacheHit={cacheHit}
          semanticCacheHit={semanticCacheHit}
          similarityScore={similarityScore}
          cachedPrompt={cachedPrompt}
          currentPrompt={currentPrompt}
          showPromptDiff={showPromptDiff}
          setShowPromptDiff={setShowPromptDiff}
        />
        <OutputPanel output={output} outputRef={outputRef} />
      </div>

      <AppSidebar
        sidebarOpen={sidebarOpen}
        sidebarMode={sidebarMode}
        setSidebarOpen={setSidebarOpen}
        testCase={testCase}
        setTestCase={setTestCase}
        lastTestCaseUpdate={lastTestCaseUpdate}
        testCaseCacheHit={testCaseCacheHit}
        generateTestCases={generateTestCases}
        importTestCase={importTestCase}
        clearTestCases={clearTestCases}
        llmPrompt={llmPrompt}
        setLlmPrompt={setLlmPrompt}
        applyLlmPrompt={applyLlmPrompt}
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
      />
    </div>
  )
}

export default App
