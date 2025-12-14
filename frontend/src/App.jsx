import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import './App.css'

function App() {
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [vimEnabled, setVimEnabled] = useState(true)
  const [testCase, setTestCase] = useState('addends = two_sum([2, 7, 11, 15], 9)\nprint(addends)')
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
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Test Case</div>
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
      </div>
      <div className="container">
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
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
          </div>
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
            style={{ fontSize: 14, height: 'calc(100% - 40px)' }}
          />
        </div>
        <div>
          <div style={{ marginBottom: '0.5rem', color: '#d4d4d4' }}>Output</div>
          <pre ref={outputRef} style={{ height: 'calc(100% - 30px)' }}>{output}</pre>
        </div>
      </div>
    </div>
  )
}

export default App
