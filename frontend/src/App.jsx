import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vim } from '@replit/codemirror-vim'
import './App.css'

function App() {
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')
  const [vimEnabled, setVimEnabled] = useState(true)
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

  return (
    <div className="app">
      <h1>Code Runner</h1>
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
