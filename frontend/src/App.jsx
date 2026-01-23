import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'
import './styles/sidebar.css'
import './styles/components.css'
import { API_URL } from './config'
import { useJobManager } from './hooks/useJobManager'
import { usePromptLoader } from './hooks/usePromptLoader'
import JobQueue from './components/app/JobQueue'
import Header from './components/app/Header'
import LeetCodeInput from './components/app/LeetCodeInput'
import OutputPanel from './components/app/OutputPanel'
import AppSidebar from './components/app/sidebar/AppSidebar'
import Spinner from './components/ui/Spinner'

// Lazy load heavy CodeMirror component
const CodeEditorPanel = lazy(() => import('./components/app/CodeEditorPanel'))

function App() {
  const navigate = useNavigate()
  const outputRef = useRef(null)

  // UI state (sidebar, modals, toggles)
  const [ui, setUi] = useState({
    sidebarOpen: false,
    sidebarMode: 'solution-prompt',
    vimEnabled: true,
    showPromptDiff: false,
    showRagChunks: false
  })

  // Loading states for LLM API requests
  const [loading, setLoading] = useState({
    leetcode: false,
    codeModification: false,
    testCases: false
  })

  // Editor/Content state (all editable content)
  const [content, setContent] = useState({
    code: '',
    output: '',
    testCase: '',
    llmPrompt: '',
    leetcodeNumber: ''
  })

  // Response metadata state (cache, RAG, etc.)
  const [metadata, setMetadata] = useState({
    lastUpdate: null,
    cacheHit: false,
    semanticCacheHit: false,
    similarityScore: null,
    cachedPrompt: null,
    currentPrompt: null,
    testCaseLastUpdate: null,
    testCaseCacheHit: false,
    ragDocCount: 0,
    ragChunks: [],
    tokensSent: 0,
    tokensReceived: 0
  })

  // Custom hooks
  const { jobs, currentJobId, currentJobStatus, currentJobMessage, startJob, clearCompletedJobs } = useJobManager()
  const { basePrompt, promptModifier, activePreset, loadingBasePrompt, applyPreset, resetPromptToDefault, getFinalPrompt, setPromptModifier, setBasePrompt, setActivePreset } = usePromptLoader(content.leetcodeNumber)

  useEffect(() => {
    fetch(`${API_URL}/api/code`)
      .then(res => res.json())
      .then(data => setContent(prev => ({ ...prev, code: data.code || '' })))
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [content.output])

  // Update UI when job completes successfully
  useEffect(() => {
    if (currentJobStatus === 'SUCCESS') {
      const currentJob = jobs.find(j => j.id === currentJobId)
      if (currentJob && currentJob.result && currentJob.result.success) {
        // Handle different result types based on what fields exist
        if (currentJob.result.response) {
          // LeetCode job - update code editor
          setContent(prev => ({ ...prev, code: currentJob.result.response }))
        } else if (currentJob.result.code) {
          // Code modification job - update code editor
          setContent(prev => ({ ...prev, code: currentJob.result.code }))
        } else if (currentJob.result.test_cases) {
          // Test case generation job - update test case window
          setContent(prev => ({ ...prev, testCase: currentJob.result.test_cases }))
          setMetadata(prev => ({
            ...prev,
            testCaseLastUpdate: new Date(),
            testCaseCacheHit: currentJob.result.from_cache || false
          }))
          return // Don't update lastUpdate for test cases
        }

        setMetadata(prev => ({
          ...prev,
          lastUpdate: new Date(),
          cacheHit: currentJob.result.from_cache || false,
          semanticCacheHit: currentJob.result.semantic_cache_hit || false,
          similarityScore: currentJob.result.similarity_score || null,
          cachedPrompt: currentJob.result.cached_prompt || null,
          currentPrompt: currentJob.result.current_prompt || null,
          ragDocCount: currentJob.result.rag_doc_count || 0,
          ragChunks: currentJob.result.rag_chunks || [],
          tokensSent: currentJob.result.tokens_sent || 0,
          tokensReceived: currentJob.result.tokens_received || 0
        }))
        setUi(prev => ({ ...prev, showPromptDiff: false, showRagChunks: false }))
      }
    }
  }, [currentJobStatus, currentJobId, jobs])

  const runCode = async () => {
    const res = await fetch(`${API_URL}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: content.code })
    })
    const data = await res.json()
    const result = data.success ? data.stdout : `Error: ${data.error}`
    setContent(prev => ({ ...prev, output: prev.output ? `${prev.output}\n---\n${result}` : result }))
  }

  const importTestCase = () => {
    const lines = content.code.split('\n')
    let mainBlockIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("if __name__")) {
        mainBlockIndex = i
        break
      }
    }

    if (mainBlockIndex === -1) {
      const newCode = content.code + '\n\nif __name__ == "__main__":\n    ' + content.testCase.split('\n').join('\n    ')
      setContent(prev => ({ ...prev, code: newCode }))
    } else {
      const indent = '    '
      const indentedTestCase = content.testCase.split('\n').map(line => indent + line).join('\n')
      lines.splice(mainBlockIndex + 1, 0, indentedTestCase)
      setContent(prev => ({ ...prev, code: lines.join('\n') }))
    }
  }

  const clearTestCases = () => {
    const lines = content.code.split('\n')
    let mainBlockIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("if __name__")) {
        mainBlockIndex = i
        break
      }
    }

    if (mainBlockIndex === -1) return

    let endIndex = lines.length
    for (let i = mainBlockIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() && !line.startsWith('    ') && !line.startsWith('\t')) {
        endIndex = i
        break
      }
    }

    lines.splice(mainBlockIndex + 1, endIndex - mainBlockIndex - 1)
    setContent(prev => ({ ...prev, code: lines.join('\n') }))
  }

  const applyLlmPrompt = async () => {
    setLoading(prev => ({ ...prev, codeModification: true }))
    try {
      const res = await fetch(`${API_URL}/api/jobs/code-modification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content.llmPrompt, code: content.code })
      })
      const data = await res.json()

      if (data.success && data.result) {
        // Handle synchronous response
        if (data.result.code) {
          setContent(prev => ({ ...prev, code: data.result.code }))
        }

        setMetadata(prev => ({
          ...prev,
          lastUpdate: new Date(),
          cacheHit: data.result.from_cache || false,
          semanticCacheHit: data.result.semantic_cache_hit || false,
          similarityScore: data.result.similarity_score || null,
          cachedPrompt: data.result.cached_prompt || null,
          currentPrompt: data.result.current_prompt || null,
          ragDocCount: data.result.rag_doc_count || 0,
          ragChunks: data.result.rag_chunks || [],
          tokensSent: data.result.tokens_sent || 0,
          tokensReceived: data.result.tokens_received || 0
        }))
      } else if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    } finally {
      setLoading(prev => ({ ...prev, codeModification: false }))
    }
  }

  const openSolutionPromptManager = () => {
    if (!content.leetcodeNumber) {
      alert('Please enter a problem number first')
      return
    }
    setUi({ ...ui, sidebarMode: 'solution-prompt', sidebarOpen: true })
  }

  const toggleSidebar = (mode) => {
    if (ui.sidebarOpen && ui.sidebarMode === mode) {
      setUi(prev => ({ ...prev, sidebarOpen: false }))
    } else {
      setUi(prev => ({ ...prev, sidebarMode: mode, sidebarOpen: true }))
    }
  }

  const solveLeetcode = async () => {
    setUi(prev => ({ ...prev, sidebarOpen: false }))
    setLoading(prev => ({ ...prev, leetcode: true }))
    try {
      const res = await fetch(`${API_URL}/api/jobs/leetcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_number: content.leetcodeNumber,
          custom_prompt: getFinalPrompt()
        })
      })
      const data = await res.json()

      if (data.success && data.result) {
        // Handle synchronous response
        if (data.result.response) {
          setContent(prev => ({ ...prev, code: data.result.response }))
        }

        setMetadata(prev => ({
          ...prev,
          lastUpdate: new Date(),
          cacheHit: data.result.from_cache || false,
          semanticCacheHit: data.result.semantic_cache_hit || false,
          similarityScore: data.result.similarity_score || null,
          cachedPrompt: data.result.cached_prompt || null,
          currentPrompt: data.result.current_prompt || null,
          ragDocCount: data.result.rag_doc_count || 0,
          ragChunks: data.result.rag_chunks || [],
          tokensSent: data.result.tokens_sent || 0,
          tokensReceived: data.result.tokens_received || 0
        }))
      } else if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    } finally {
      setLoading(prev => ({ ...prev, leetcode: false }))
    }
  }

  const generateTestCases = async () => {
    setLoading(prev => ({ ...prev, testCases: true }))
    try {
      const res = await fetch(`${API_URL}/api/jobs/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: content.code })
      })
      const data = await res.json()

      if (data.success && data.result) {
        // Handle synchronous response
        if (data.result.test_cases) {
          setContent(prev => ({ ...prev, testCase: data.result.test_cases }))
          setMetadata(prev => ({
            ...prev,
            testCaseLastUpdate: new Date(),
            testCaseCacheHit: data.result.from_cache || false
          }))
        }
      } else if (data.error) {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch Error:', error)
      alert(`Failed to connect to server: ${error.message}`)
    } finally {
      setLoading(prev => ({ ...prev, testCases: false }))
    }
  }

  return (
    <div className="app">
      <Header
        ui={ui}
        toggleSidebar={toggleSidebar}
        navigate={navigate}
      />

      <LeetCodeInput
        leetcodeNumber={content.leetcodeNumber}
        setLeetcodeNumber={(val) => setContent(prev => ({ ...prev, leetcodeNumber: val }))}
        onSolve={openSolutionPromptManager}
      />

      <JobQueue
        jobs={jobs}
        currentJobId={currentJobId}
        onClearCompleted={clearCompletedJobs}
      />
      <div className="container">
        <Suspense fallback={
          <div style={{ flex: '2', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1e1e', border: '1px solid #3e3e42' }}>
            <div>
              <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
              <div style={{ color: '#888' }}>Loading editor...</div>
            </div>
          </div>
        }>
          <CodeEditorPanel
            content={content}
            setContent={setContent}
            ui={ui}
            setUi={setUi}
            metadata={metadata}
            setMetadata={setMetadata}
            runCode={runCode}
            importTestCase={importTestCase}
            clearTestCases={clearTestCases}
            isLoading={loading.leetcode || loading.codeModification}
            loadingMessage={
              loading.leetcode
                ? 'Generating LeetCode solution...'
                : loading.codeModification
                ? 'Applying code modifications...'
                : 'Processing...'
            }
          />
        </Suspense>
        <OutputPanel output={content.output} outputRef={outputRef} />
      </div>

      <AppSidebar
        ui={ui}
        setUi={setUi}
        content={content}
        setContent={setContent}
        metadata={metadata}
        generateTestCases={generateTestCases}
        importTestCase={importTestCase}
        clearTestCases={clearTestCases}
        applyLlmPrompt={applyLlmPrompt}
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
        startJob={startJob}
        loading={loading}
      />
    </div>
  )
}

export default App
