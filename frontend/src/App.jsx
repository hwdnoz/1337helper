import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import './App.css'

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

  const solveLeetcode = async () => {
    setLoadingLeetcode(true)
    try {
      const res = await fetch('http://localhost:5001/api/leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_number: leetcodeNumber })
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
      <h1>Code Runner</h1>
      <div style={{
        background: '#1e1e1e',
        border: '1px solid #3e3e42',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '2px'
      }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>LeetCode Problem Solver</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="number"
            value={leetcodeNumber}
            onChange={e => setLeetcodeNumber(e.target.value)}
            placeholder="Enter problem number (e.g., 70)"
            style={{
              flex: 1,
              background: '#2d2d2d',
              color: '#d4d4d4',
              border: '1px solid #3e3e42',
              borderRadius: '2px',
              padding: '0.5rem',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}
          />
          <button onClick={solveLeetcode}>Solve</button>
        </div>
      </div>
      <div style={{
        background: '#1e1e1e',
        border: '1px solid #3e3e42',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '2px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ fontWeight: 'bold' }}>Test Case</div>
          <button onClick={generateTestCases} style={{ padding: '0.25rem 1rem' }}>Generate Test Cases</button>
        </div>
        <textarea
          value={testCase}
          onChange={e => setTestCase(e.target.value)}
          style={{
            width: '100%',
            minHeight: '60px',
            background: '#2d2d2d',
            color: '#d4d4d4',
            border: '1px solid #3e3e42',
            borderRadius: '2px',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            resize: 'vertical'
          }}
        />
        {loadingTestCases && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </div>
      <div style={{
        background: '#1e1e1e',
        border: '1px solid #3e3e42',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '2px'
      }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>LLM Prompt</div>
        <textarea
          value={llmPrompt}
          onChange={e => setLlmPrompt(e.target.value)}
          placeholder="Enter instructions to modify the code..."
          style={{
            width: '100%',
            minHeight: '60px',
            background: '#2d2d2d',
            color: '#d4d4d4',
            border: '1px solid #3e3e42',
            borderRadius: '2px',
            padding: '0.5rem',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            resize: 'vertical'
          }}
        />
        <button
          onClick={applyLlmPrompt}
          style={{ marginTop: '0.5rem' }}
        >
          Apply Prompt
        </button>
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
    </div>
  )
}

export default App
