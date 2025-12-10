import { useState, useEffect } from 'react'
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
          <textarea value={code} onChange={e => setCode(e.target.value)} />
        </div>
        <pre>{output}</pre>
      </div>
    </div>
  )
}

export default App
