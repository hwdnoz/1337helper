import { useState, useEffect } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-python'
import 'prismjs/themes/prism-dark.css'
import './App.css'

function App() {
  const [code, setCode] = useState('')
  const [output, setOutput] = useState('')

  useEffect(() => {
    fetch('http://localhost:5001/api/code')
      .then(res => res.json())
      .then(data => setCode(data.code || ''))
  }, [])

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
          <button onClick={runCode}>RUN</button>
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={code => highlight(code, languages.python, 'python')}
            padding={16}
            style={{
              fontFamily: 'monospace',
              fontSize: 14,
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              border: '1px solid #3e3e42',
              minHeight: 'calc(100% - 40px)'
            }}
          />
        </div>
        <pre>{output}</pre>
      </div>
    </div>
  )
}

export default App
